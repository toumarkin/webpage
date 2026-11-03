import numpy as np, json
from PIL import Image
from scipy import ndimage
exec(open('v3/build.py').read().split("B=clean(")[0])   # brings clean()
NAMES=['down','balance','tpose','up','reach','wave']
def jeans_box(a):
    r,g,b,al=[a[...,i].astype(int) for i in range(4)]
    belt=(al>200)&(r>80)&(r<190)&(g>45)&(g<120)&(b<80)&(r-b>45)
    jeans=(al>200)&(b>r+8)&(b>140)
    rows=np.where(jeans.sum(1)>40)[0]; bottom=rows.max()
    by=np.where(belt.sum(1)>60)[0]; by=by[by<bottom-350]; belt_y=int(np.median(by))
    row=belt_y+200; xs=np.where(jeans[row-10:row+10].any(0))[0]
    return belt_y,bottom,xs.min(),xs.max()
def neck(a):
    al=a[...,3].copy(); jb=jeans_box(a); c=int((jb[2]+jb[3])/2); al[:,:c-110]=0; al[:,c+110:]=0
    rows=np.where((al>200).sum(1)>0)[0]
    # neck stub = topmost opaque blob in the central column band
    for y in range(rows.min(),rows.min()+400):
        xs=np.where(al[y]>200)[0]
        if len(xs) and xs.max()-xs.min()<120: top=y; break
    xs=np.where(al[top+30]>200)[0]; cx=(xs.min()+xs.max())/2
    return cx,top
frames={n:clean(np.array(Image.open(f'v4/{n}.png').convert('RGBA'))) for n in NAMES}
ref=jeans_box(frames['down']); refH=ref[1]-ref[0]; refCx=(ref[2]+ref[3])/2
OUT=1700; out={}; necks={}
for n,a in frames.items():
    jb=jeans_box(a); s=refH/(jb[1]-jb[0]); cx=(jb[2]+jb[3])/2
    # map: out = s*(p - (cx,top)) + (OUT/2, 700)
    tx=OUT/2 - s*cx; ty=700 - s*jb[0]
    im=Image.fromarray(a).transform((OUT,OUT),Image.AFFINE,(1/s,0,-tx/s,0,1/s,-ty/s),resample=Image.BICUBIC)
    out[n]=np.array(im)
    nx,ny=neck(a); necks[n]=(s*nx+tx, s*ny+ty)
    print(n,'scale %.3f'%s,'jeans',jb,'neck top',[round(v) for v in necks[n]])
np.save('v4/aligned.npy',np.stack([out[n] for n in NAMES])); json.dump(necks,open('v4/necks.json','w'))
# overlay check: down vs every other frame
prev=Image.new('RGB',(OUT*3//2,OUT//2),'white')
for i,n in enumerate(['balance','up','wave']):
    A_=out['down'].astype(float); B_=out[n].astype(float)
    c=np.full((OUT,OUT,3),255.); 
    c-= (A_[...,3:4]/255)*np.array([0,120,120]); c-= (B_[...,3:4]/255)*np.array([120,120,0])
    prev.paste(Image.fromarray(np.clip(c,0,255).astype(np.uint8)).resize((OUT//2,OUT//2)),(i*OUT//2,0))
prev.save('v4/overlay.png')
