const webglDOM = document.querySelector('#webgl');
const canvasSize = {
  width: window.innerWidth,
  height: window.innerHeight,
};

const renderer = new THREE.WebGLRenderer({
  canvas: webglDOM,
  alpha: true
});
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(canvasSize.width, canvasSize.height);

// 调整摄像机以匹配窗口和 webGL 坐标，以便绘图适合窗口
const fov = 60;
const fovRad = (fov / 2) * (Math.PI / 180);
const dist = canvasSize.height / 2 / Math.tan(fovRad);
const camera = new THREE.PerspectiveCamera(
  fov,
  canvasSize.width / canvasSize.height,
  0.1,
  1000
);
camera.position.z = dist;

const scene = new THREE.Scene();

const loader = new THREE.TextureLoader();

// 处理纹理图像平面的类
class ImagePlane {
  constructor(mesh, img) {
    this.refImage = img;
    this.mesh = mesh;
  }

  setParams() {
    // 从引用的 img 元素获取大小、位置和集
    const rect = this.refImage.getBoundingClientRect();

    this.mesh.scale.x = rect.width;
    this.mesh.scale.y = rect.height;

    const x = rect.left - canvasSize.width / 2 + rect.width / 2;
    const y = -rect.top + canvasSize.height / 2 - rect.height / 2;
    this.mesh.position.set(x, y, this.mesh.position.z);
  }

  update(offset) {
    this.setParams();
    this.mesh.material.uniforms.uTime.value = offset; // offet 接收
  }
}

// 滚动跟随
let targetScrollY = 0; // 初始滚动位置
let currentScrollY = 0; // 应用线性插值的当前滚动位置
let scrollOffset = 0; // 上述两者差值

// 平滑插值开始和结束的函数
const lerp = (start, end, multiplier) => {
  return (1 - multiplier) * start + multiplier * end;
};

const updateScroll = () => {
  // 获取滚动位置
  targetScrollY = document.documentElement.scrollTop;
  // 使用跳动函数平滑地跟随滚动位置
  currentScrollY = lerp(currentScrollY, targetScrollY, 0.1);

  scrollOffset = targetScrollY - currentScrollY;
};

// 创建平面网格
const createMesh = (img) => {
  const texture = loader.load(img.src);

  const uniforms = {
    uTexture: {
      value: texture
    },
    uImageAspect: {
      value: img.naturalWidth / img.naturalHeight
    },
    uPlaneAspect: {
      value: img.clientWidth / img.clientHeight
    },
    uTime: {
      value: 0
    },
  };
  const geo = new THREE.PlaneBufferGeometry(1, 1, 100, 100);
  const mat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: document.querySelector('#v-shader').textContent,
    fragmentShader: document.querySelector('#f-shader').textContent,
  });

  const mesh = new THREE.Mesh(geo, mat);

  return mesh;
};

const imagePlaneArray = [];

// 重绘动画
const loop = () => {
  updateScroll();
  for (const plane of imagePlaneArray) {
    plane.update(scrollOffset);
  }
  renderer.render(scene, camera);

  requestAnimationFrame(loop);
};

const main = () => {
  window.addEventListener('load', () => {
    const imageArray = document.querySelectorAll('img');
    for (const img of imageArray) {
      const mesh = createMesh(img);
      scene.add(mesh);

      const imagePlane = new ImagePlane(mesh, img);
      imagePlane.setParams();

      imagePlaneArray.push(imagePlane);
    }
    loop();
  });

  // 调整大小（在调整大小后点火以减轻负载）
  window.addEventListener('resize', () => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(resize, 200);
  });
};

main();

let timeoutId = 0;
const resize = () => {
  const width = window.innerWidth;
  const height = window.innerHeight;

  canvasSize.width = width;
  canvasSize.height = height;

  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(width, height);

  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  // 重新计算摄像机距离
  const fov = 60;
  const fovRad = (fov / 2) * (Math.PI / 180);
  const dist = canvasSize.height / 2 / Math.tan(fovRad);
  camera.position.z = dist;
};