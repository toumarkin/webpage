import numpy as np, json, math, io, base64, sys
from PIL import Image, ImageDraw
from scipy import ndimage
def clean(a):
    a=a.copy(); r,g,b,al=[a[...,i].astype(int) for i in range(4)]
    edge=ndimage.binary_dilation(al<20,iterations=4)
    bad=((r-b>110)&(g<150))|((r>190)&(g>170)&(b<90))|((r>170)&(g<90)&(b<90))
    a[...,3][edge&bad]=0
    a[...,3][(r>170)&(g<90)&(b<90)]=0   # stray pure-red fringe anywhere
    return a
B=clean(np.array(Image.open('v3/body.png').convert('RGBA')))
H,W=B.shape[:2]; Y,X=np.mgrid[0:H,0:W].astype(float)
def line_x(pts): return np.interp(Y[:,0],[p[1] for p in pts],[p[0] for p in pts])[:,None]
def soft(m,s=1.0): return ndimage.gaussian_filter(m.astype(float),s)
def fade(lo,hi,down=True):
    t=np.clip((Y-lo)/(hi-lo),0,1); return 1-t if down else t
def fadex(lo,hi,left=True):
    t=np.clip((X-lo)/(hi-lo),0,1); return 1-t if left else t
SXL,SXR=558,740   # shoulder pivots, pulled in toward the body
armBand=(Y>270)&(Y<430)
armL=(armBand&(X<line_x([(545,0),(545,300),(536,395),(536,1239)])))|(np.hypot(X-540,Y-345)<48)
armR=(armBand&(X>line_x([(752,0),(752,300),(762,395),(762,1239)])))|(np.hypot(X-757,Y-345)<48)
body=~(armBand&(X<line_x([(545,0),(545,300),(536,395),(536,1239)])))&~(armBand&(X>line_x([(752,0),(752,300),(762,395),(762,1239)])))
legsplit=line_x([(650,0),(650,600),(652,700),(668,900),(700,1100),(705,1239)])
M={}
capL=np.hypot(X-SXL,Y-340)<40; capR=np.hypot(X-SXR,Y-340)<40
M['torso']=np.clip(soft(body&(Y<720))*fade(670,715)+soft(capL|capR,1.5)*(Y<420),0,1)
cL=np.hypot(X-300,Y-340)<23
M['upperL']=soft(armL&((X>300)|cL)&((X<SXL)|(np.hypot(X-SXL,Y-340)<34)))
M['foreL']=soft(armL&((X<300)|cL))
cR=np.hypot(X-985,Y-342)<23
M['upperR']=soft(armR&((X<985)|cR)&((X>SXR)|(np.hypot(X-SXR,Y-340)<34)))
M['foreR']=soft(armR&((X>985)|cR))
kL=np.hypot(X-582,Y-900)<86; kR=np.hypot(X-770,Y-900)<86
M['thighL']=soft(body&(X<legsplit)&(Y>600)&((Y<900)|kL))
M['thighR']=soft(body&(X>=legsplit)&(Y>600)&((Y<900)|kR))
M['shinL']=soft(body&(X<legsplit)&((Y>900)|kL))
M['shinR']=soft(body&(X>=legsplit)&((Y>900)|kR))
IM={}
for k,m in M.items():
    a=B.copy(); a[...,3]=(a[...,3]*np.clip(m,0,1)).astype(np.uint8); IM[k]=a
# pivots in body-image px (shared coordinate system, so attach == child pivot)
PIV={'torso':(648,660),'upperL':(SXL,340),'foreL':(300,338),'upperR':(SXR,340),'foreR':(985,340),
     'thighL':(588,650),'shinL':(582,900),'thighR':(712,650),'shinR':(770,900),'head':(646,300)}
PARENT={'torso':None,'upperL':'torso','foreL':'upperL','upperR':'torso','foreR':'upperR',
        'thighL':'torso','shinL':'thighL','thighR':'torso','shinR':'thighR','head':'torso'}
Z={'shinL':1,'shinR':1,'thighL':2,'thighR':2,'upperL':3.8,'upperR':3.8,'foreL':4.5,'foreR':4.5,'torso':4,'head':6}
# ---- heads: split the 3x3 sheet ----
Hs=clean(np.array(Image.open('v3/heads.png').convert('RGBA')))
lab,n=ndimage.label(Hs[...,3]>30)
sizes=ndimage.sum(np.ones_like(lab),lab,range(1,n+1))
boxes=[]; masks=[]
for rI in range(3):
    for cI in range(3):
        cy,cx0=rI*418+209,cI*418+209
        # components whose pixels mostly fall in this cell (by centroid), ignoring specks
        keep=np.zeros(lab.shape,bool)
        for i in range(1,n+1):
            if sizes[i-1]<40: continue
            sl=ndimage.find_objects((lab==i).astype(int))[0]
            ys,xs=np.where(lab[sl]==i); my,mx_=ys.mean()+sl[0].start, xs.mean()+sl[1].start
            if abs(my-cy)<209 and abs(mx_-cx0)<209: keep[sl]|=(lab[sl]==i)
        ys,xs=np.where(keep); boxes.append((slice(ys.min(),ys.max()+1),slice(xs.min(),xs.max()+1))); masks.append(keep)
heads=[]
for sl,km in zip(boxes,masks):
    a=Hs[sl].copy(); a[...,3][~km[sl]]=0; 
    r,g,b,al=[a[...,i].astype(int) for i in range(4)]
    skin=(al>200)&(r>200)&(g>150)&(b>100)&(r-b<110)
    ys,xs=np.where(skin); yb=ys.max()
    band=skin[yb-25:yb-5]; bx=np.where(band.any(0))[0]
    neck_w=bx.max()-bx.min(); cx=(bx.max()+bx.min())/2
    hh,ww=a.shape[:2]; yy,xx=np.mgrid[0:hh,0:ww]
    R,G,Bc=a[...,0].astype(int),a[...,1].astype(int),a[...,2].astype(int)
    mx=np.maximum(np.maximum(R,G),Bc); mn=np.minimum(np.minimum(R,G),Bc)
    hairish=(R>G)&(G>=Bc-5)&((mx-mn)>40)&(mx<235)
    kill=((yy>yb-2)&(np.abs(xx-cx)<neck_w*0.9)&~hairish)|((yy>yb+4)&(np.abs(xx-cx)<neck_w*0.75))
    a[...,3][kill]=0
    heads.append({'a':a,'neck':(cx,yb-6),'nw':neck_w})
print('neck widths',[h['nw'] for h in heads],'sizes',[h['a'].shape[:2] for h in heads])
# body neck width for head scale
r,g,b,al=[B[...,i].astype(int) for i in range(4)]
row=(al[255]>200); bx=np.where(row[600:700])[0]; body_nw=bx.max()-bx.min()
HS=body_nw/np.mean([h['nw'] for h in heads])
def mat(tx,ty,th,s=1):
    c,si=math.cos(th),math.sin(th); return np.array([[c*s,-si*s,tx],[si*s,c*s,ty],[0,0,1]])
def compose(pose,head_i=0,W=1300,Hh=1300):
    canvas=Image.new('RGBA',(W,Hh),(250,250,247,255)); world={}; items=[]
    for n in PIV:
        rot=pose.get(n,0)
        p=PIV[n]
        if PARENT[n] is None: pos=np.array(p,float); th=rot
        else:
            P=world[PARENT[n]]; pos=(P['M']@np.array([*p,1]))[:2]; th=P['th']+rot
        M=mat(*pos,th)@mat(-p[0],-p[1],0); world[n]={'M':M,'th':th}
        if n=='head':
            h=heads[head_i]; M=mat(*pos,th)@mat(0,0,0,HS)@mat(-h['neck'][0],-h['neck'][1],0); img=h['a']
        else: img=IM[n]
        items.append((Z[n],n,M,img))
    for z,n,M,img in sorted(items,key=lambda t:t[0]):
        Mi=np.linalg.inv(M); canvas.alpha_composite(Image.fromarray(img).transform((W,Hh),Image.AFFINE,tuple(Mi[:2].flatten()),resample=Image.BICUBIC))
    return canvas
if __name__=='__main__':
    print('body neck',body_nw,'head scale',HS)
    poses=[({},0),({'upperL':-1.45,'upperR':1.45,'foreL':-0.05,'foreR':0.05},1),
           ({'upperL':-0.2,'foreL':-0.3,'upperR':0.15,'foreR':0.4,'thighR':-0.2,'shinR':0.3,'torso':0.08,'head':-0.15},3),
           ({'upperL':0.9,'foreL':0.3,'upperR':-0.9,'foreR':-0.3,'thighL':0.2,'thighR':-0.2},5)]
    outs=[compose(p,h) for p,h in poses]
    Wd=Image.new('RGB',(400*len(outs),400),'white')
    for i,o in enumerate(outs): Wd.paste(o.resize((400,400)).convert('RGB'),(400*i,0))
    Wd.save('v3/prev.png')
    Ws=Image.new('RGB',(9*130,180),'white')
    for i,h in enumerate(heads):
        im=Image.fromarray(h['a']); im.thumbnail((130,180)); bg=Image.new('RGBA',im.size,(250,250,247,255)); bg.alpha_composite(im); Ws.paste(bg.convert('RGB'),(i*130,0))
    Ws.save('v3/heads_prev.png')
