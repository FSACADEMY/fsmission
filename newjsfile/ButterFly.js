// https://discourse.threejs.org/t/schmetterling-butterfly-no-webgl-depth-sorting/48919
import {
  Box2,
  BufferGeometry,
  BufferAttribute,
  Color,
  MathUtils,
  Object3D,
  Path,
  PerspectiveCamera,
  Scene,
  Vector2,
  Vector3,
  Matrix4
} from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

console.clear();

class Material {
  constructor(fill = "gray", stroke = "black", lineWidth = 2, closed = true) {
    this.fill = fill;
    this.stroke = stroke;
    this.lineWidth = lineWidth;
    this.closed = closed;
  }
}

class Drawable extends Object3D {
  constructor() {
    super();
    this.isDrawable = true;
  }
}

class Polygon extends Drawable {
  constructor(geometry, material) {
    super();
    this.geometry = geometry;
    this.material = material;
    this.isPolygon = true;
  }
}

class Circle extends Drawable {
  constructor(radius = 1, material) {
    super();
    this.radius = radius;
    this.material = material;
    this.isCircle = true;
    this.vertices = [new Vector3(), new Vector3(0, 1, 0).setLength(radius)];
  }
}

class CanvasRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.context = this.canvas.getContext("2d");
    this.halfSize = new Vector3();
    this.renderList = [];
    this._projectScreenMatrix = new Matrix4();
    this._vector3 = new Vector3();
  }

  setSize(width, height) {
    this.canvas.width = width;
    this.canvas.height = height;
    this.halfSize.set(width, height, 0).multiplyScalar(0.5);
  }

  sort(scene) {
    this.renderList = [];
    scene.traverse((child) => {
      if (child.isDrawable) {
        this._vector3
          .setFromMatrixPosition(child.matrixWorld)
          .applyMatrix4(this._projectScreenMatrix);
        this.renderList.push({
          object: child,
          z: this._vector3.z
        });
      }
    });
    this.renderList.sort((a, b) => b.z - a.z);
  }

  render(scene, camera) {
    scene.updateMatrixWorld();
    camera.updateMatrixWorld();
    this._projectScreenMatrix.multiplyMatrices(
      camera.projectionMatrix,
      camera.matrixWorldInverse
    );
    this.sort(scene);

    let c = this.context;
    let v3 = this._vector3;
    let hs = this.halfSize;
    c.clearRect(0, 0, this.canvas.width, this.canvas.height);

    for (let i = 0; i < this.renderList.length; i++) {
      let listObject = this.renderList[i].object;
      let z = this.renderList[i].z;
      let g = listObject.geometry;
      let m = listObject.material;

      if (listObject.isPolygon) {
        c.beginPath();
        toScreen(listObject, 0, v3, hs);
        c.moveTo(v3.x, v3.y);
        for (let j = 1; j < g.attributes.position.count; j++) {
          toScreen(listObject, j, v3, hs);
          c.lineTo(v3.x, v3.y);
        }
        if (m.closed) {
          c.closePath();
        }
        if (m.fill) {
          c.fillStyle = m.fill;
          c.fill();
        }
        if (m.stroke) {
          c.lineWidth = m.lineWidth;
          c.strokeStyle = m.stroke;
          c.stroke();
        }
      }

      if (listObject.isCircle) {
        if(z <= 0) continue;
        listObject.lookAt(camera.position);
        listObject.updateMatrixWorld();
        vecToScreen(listObject, listObject.vertices[0], v3, hs);
        let cx = v3.x;
        let cy = v3.y;
        vecToScreen(listObject, listObject.vertices[1], v3, hs);
        let r = Math.hypot(v3.x - cx, v3.y - cy);
        c.beginPath();
        c.arc(cx, cy, r, 0, Math.PI * 2);

        if (m.fill) {
          c.fillStyle = m.fill;
          c.fill();
        }
        if (m.stroke) {
          c.lineWidth = m.lineWidth;
          c.strokeStyle = m.stroke;
          c.stroke();
        }
      }
    }

    function vecToScreen(object, v) {
      v3.copy(v);
      object.localToWorld(v3);
      commonCast(v3);
    }
    function posToScreen(object) {
      v3.setFromMatrixPosition(object.matrixWorld);
      commonCast(v3);
    }
    function toScreen(object, vertexID) {
      v3.fromBufferAttribute(object.geometry.attributes.position, vertexID);
      object.localToWorld(v3);
      commonCast(v3);
    }
    function commonCast(v3) {
      v3.project(camera);
      v3.y *= -1;
      v3.multiply(hs).add(hs);
    }
  }
}

class Butterfly extends Object3D {
  constructor() {
    super();
    let holder = new Object3D();
    holder.rotation.set(Math.PI * 0.5, Math.PI, 0);
    this.add(holder);
    // head and body
    let mBody = new Material("black", "#303030", 2);
    let head = new Circle(0.25, mBody);
    head.position.y = 0.5;
    holder.add(head);

    for (let i = 0; i < 7; i++) {
      let bPart = new Circle(0.25 - i * 0.025, mBody);
      bPart.position.y = 0.125 - i * 0.25;
      holder.add(bPart);
    }

    // wings
    this.wingParts = [];
    for (let sign = 1; sign >= -1; sign -= 2) {
      let wingHolder = new Object3D();
      wingHolder.position.set(0.25 * sign, 0, 0);
      holder.add(wingHolder);
      let partTop = makePart(4, 5, 6, 1, sign, 1);
      let partBottom = makePart(3, 4, 5, 0.5, sign, -1);
      partTop.userData = {
        rotStart: Math.PI * 0.5 * -sign,
        rotAmp: Math.PI / 4 * 3,
        rotDir: sign,
        rotShift: 0
      }
      partBottom.userData = {
        rotStart: Math.PI * 0.5 * -sign,
        rotAmp: Math.PI / 4 * 3,
        rotDir: sign,
        rotShift: -0.2
      }
      partTop.rotation.order = "YXZ";
      partBottom.rotation.order = "YXZ";
      wingHolder.add(partTop, partBottom);
      this.wingParts.push(partTop, partBottom);
    }
    
    function makePart(
      layersAmount,
      effectiveWidth,
      effectiveHeight,
      start,
      xSign,
      ySign
    ) {
      let partObject = new Object3D();
      let pts = [];
      let startX = 0;
      for(let layers = 0; layers < layersAmount; layers++){
        let divisor = layers + 1; // Math.pow(2, layers);
        let layerWidth = 1 - ((1 / (layersAmount * 2 - 1)) * layers);//layersAmount / divisor;
        let layerBlockHeight = layersAmount / divisor;
        for (let layerBlocks = 0; layerBlocks < divisor; layerBlocks++){
          pts.push(
            new Vector2(startX, layerBlockHeight * (layerBlocks + 0)),
            new Vector2(startX, layerBlockHeight * (layerBlocks + 1)),
            new Vector2(startX + layerWidth, layerBlockHeight * (layerBlocks + 1)),
            new Vector2(startX + layerWidth, layerBlockHeight * (layerBlocks + 0))
          )
        }
        startX += layerWidth;
      }
      
      let b2 = new Box2().setFromPoints(pts);
      let bSize = new Vector2();
      b2.getSize(bSize);
      let sizeRatio = new Vector2(effectiveWidth / bSize.x, effectiveHeight / bSize.y);
      let p0 = new Vector2(), p1 = new Vector2(), p2 = new Vector2(), p3 = new Vector2();
      let blockCenter = new Vector2();
      let bilinBottom = new Vector2(), bilinTop = new Vector2(), bilinMid = new Vector2();
      let cp0 = new Vector2(0, 0), cp1 = new Vector2(0, start), cp2 = new Vector2(effectiveWidth, effectiveHeight), cp3 = new Vector2(effectiveWidth, 0);
      let blockBox = new Box2();
      let boxColor = new Color();
      let blockCount = pts.length / 4;
      for(let block = 0; block < blockCount; block++){
        let blockPts = [
          p0.copy(pts[block * 4 + 0]).multiply(sizeRatio),
          p1.copy(pts[block * 4 + 1]).multiply(sizeRatio),
          p2.copy(pts[block * 4 + 2]).multiply(sizeRatio),
          p3.copy(pts[block * 4 + 3]).multiply(sizeRatio)
        ];
        blockPts.forEach(p => {
          let uvX = p.x / effectiveWidth;
          let uvY = p.y / effectiveHeight;
          bilinBottom.lerpVectors(cp0, cp3, uvX);
          bilinTop.lerpVectors(cp1, cp2, uvX);
          bilinMid.lerpVectors(bilinBottom, bilinTop, uvY);
          p.copy(bilinMid);
          p.x *= xSign;
          p.y *= ySign;
        })
        blockBox.setFromPoints(blockPts);
        blockBox.getCenter(blockCenter);
        blockPts.forEach(p => {
          p.sub(blockCenter);
        });
        let g = new BufferGeometry().setFromPoints(pathPoints(blockPts));
        let m = new Material("#" + boxColor.setHSL(block / (blockCount - 1), 1, 0.75).getHexString(), "maroon");
        let oBlock = new Polygon(g, m);
        oBlock.position.set(blockCenter.x, blockCenter.y, 0);
        partObject.add(oBlock);
      }
      return partObject;
    }
    
    function pathPoints(pts){
      let blockPath = new Path();
      blockPath.moveTo((pts[pts.length - 1].x + pts[0].x) / 2, (pts[pts.length - 1].y + pts[0].y) / 2);
      pts.forEach((p, idx) => {
        let idxNext = (idx + 1)
        idxNext = idxNext == pts.length ? 0 : idxNext;
        let pn = pts[idxNext];
        blockPath.quadraticCurveTo(p.x, p.y, (pn.x + p.x) / 2, (pn.y + p.y) / 2);
      })
      return blockPath.getSpacedPoints(50);
    }
    
    // antennae
    let mAntenna = new Material(null, "black", 2, false);
    new Array(2).fill().forEach((_, idx) => {
      let flip = idx === 0 ? -1 : 1;
      let w = 1;
      let h = 2.5;
      let path = new Path();
      path.moveTo(0, 0);
      path.bezierCurveTo(0, -1, w * flip, -h + 1, w * flip, -h);
      let g = new BufferGeometry().setFromPoints(path.getSpacedPoints(10));
      let antenna = new Polygon(g, mAntenna);
      antenna.rotation.x = Math.PI * 0.1;
      antenna.position.set(w * -flip, 0.3 + h, 0.75);
      holder.add(antenna);
    });
    
    this.update = (time) =>{
      this.wingParts.forEach(wp => {
        let ud = wp.userData;
        let t = time * 4 + ud.rotShift;
        let sinVal = Math.sin(t) * 0.5 + 0.5;
        let cosVal = Math.cos(t);
        wp.rotation.y = ud.rotStart + ud.rotAmp * ud.rotDir * sinVal;
        wp.rotation.x = MathUtils.degToRad(20) * cosVal * -Math.abs(ud.rotDir);
      })
    }
  }
}

class Particles extends Object3D{
  constructor(amount){
    super();
    let col = new Color();
    this.amount = amount;
    this.size = 20
    this.particles = new Array(amount).fill().map(p => {
      let m = new Material();
      let c = new Circle(MathUtils.randFloat(0.05, 0.25), m);
      c.userData = {
        initPos: new Vector3().random().subScalar(0.5).multiplyScalar(this.size),
        color: {h: Math.random(), s: 0.75, l: 0.75}
      }
      c.position.copy(c.userData.initPos);
      this.add(c);
      return c
    })
    this.update = time => {
      let t = time * 8;
      this.particles.forEach(p => {
        let ud = p.userData;
        let z = ud.initPos.z;
        p.position.z = this.size * 0.5 + (z - t - this.size * 0.5) % this.size;
        let a = 1. - MathUtils.smoothstep(Math.abs(p.position.z), this.size * 0.5 * 0.5, this.size * 0.5);
        p.material.fill = `hsl(${ud.color.h * 360}, ${ud.color.s * 100}%, ${ud.color.l * 100}%, ${a})`;
        p.material.stroke = `hsl(0, 100%, 25%, ${a})`; //maroon
      })
    }
  }
}

let scene = new Scene();
let camera = new PerspectiveCamera(60, innerWidth / innerHeight, 1, 100);
camera.position.setFromSphericalCoords(17, Math.PI * 0.75, -Math.PI * 0.25);
let renderer = new CanvasRenderer(cnv);
renderer.setSize(innerWidth, innerHeight);
window.addEventListener("resize", (event) => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

let controls = new OrbitControls(camera, renderer.canvas);
controls.minDistance = camera.position.length();
controls.maxDistance = controls.minDistance * 2;
controls.enablePan = false;
controls.enableDamping = true;

let butterfly = new Butterfly();
let particles = new Particles(100);

let updatables = [];
updatables.push(butterfly, particles);
scene.add(butterfly, particles);

let timeStart = performance.now();

draw();

function draw() {
  let t = (performance.now() - timeStart) * 0.001;
  controls.update();
  
  updatables.forEach(u => {u.update(t)});
  
  renderer.render(scene, camera);
  requestAnimationFrame(draw);
}