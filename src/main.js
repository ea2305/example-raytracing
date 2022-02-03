// Canvas configuration
const canvas = document.querySelector("#canvas");
const ctx = canvas.getContext("2d");
const canvasBuffer = ctx.getImageData(0, 0, canvas.width, canvas.height);
const canvasPitch = canvasBuffer.width * 4;
const BACKGROUND = [255, 255, 255];
const PROJECTION_Z = 1;

class Vector {
  constructor(x = 0, y = 0, z = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
  }

  dot (u) {
    let { x, y, z } = this;
    return (x * u.x) + (y * u.y) + (z * u.z)
  }

  subtract (u) {
    let { x, y, z } = this;
    return new Vector(x - u.x, y - u.y, z - u.z)
  }

  log () {
    console.log(`[${this.x}, ${this.y}, ${this.z}]`)
  }
}

class Sphere {
  constructor (center, radious, color = [0, 0, 0]) {
    this.center = center;
    this.radious = radious;
    this.color = color
  }
}

// Origin point of view, the camera lives here
const origin = new Vector(0, 0, 0);
// The inclination of the viewport and the distance (Z)
const viewport = new Vector(1, 1, 1); // viewport position in 3d space

const spheres = [
  new Sphere(new Vector(0, -1, 3), 1, [255, 0, 0]),
  new Sphere(new Vector(2, 0, 4), 1, [0, 0, 255]),
  new Sphere(new Vector(-2, 0, 4), 1, [0, 255, 0])
]

function updateCanvas () {
  ctx.putImageData(canvasBuffer, 0, 0)
}

function putPixel (x, y, color) {
  x = canvas.width / 2 + x;
  y = canvas.height / 2 - y - 1;

  if (x < 0 || x >= canvas.width || y < 0 || y >= canvas.height) {
    return;
  }

  var offset = 4*x + canvasPitch*y;
  canvasBuffer.data[offset++] = color[0];
  canvasBuffer.data[offset++] = color[1];
  canvasBuffer.data[offset++] = color[2];
  canvasBuffer.data[offset++] = 255; // Alpha = 255 (full opacity)
}

function canvasToViewport (vec) {
  return new Vector(
    vec.x * viewport.x / canvas.width,
    vec.y * viewport.y / canvas.height,
    PROJECTION_Z
  )
}

function intersectRaySphere (origin, direction, sphere) {
  const r = sphere.radious;
  const CO = origin.subtract(sphere.center);

  const a = direction.dot(direction);
  const b = 2 * CO.dot(direction);
  const c = CO.dot(CO) - (r * r);

  const discriminant = b * b -  4 * a * c;
  if (discriminant < 0) {
    return [Infinity, Infinity];
  }

  const t1 = (-b + Math.sqrt(discriminant)) / (2 * a);
  const t2 = (-b - Math.sqrt(discriminant)) / (2 * a);
  
  return [t1, t2];
}

function between (value, min, max) {
  return value >= min && value <= max
}

function TraceRay (origin, direction, min, max) {
  let closest_t = Infinity;
  let closest_sphere;

  spheres.forEach(sphere => {
    // calculate posible collitions with the spheres
    const intersections = intersectRaySphere(origin, direction, sphere) // t1, t2
    // are they between the ranges and are they closer to the camera?
    intersections.forEach((t) => {
      if (between(t, min, max) && t < closest_t) {
        closest_t = t;
        closest_sphere = sphere;
      }
    })
  });
  
  if (!closest_sphere) {
    return BACKGROUND;
  }

  return closest_sphere.color;
}

for (let x = -canvas.width / 2; x < canvas.width / 2; x++) {
  for (let y = -canvas.height / 2; y < canvas.height / 2; y++) {
    const point = new Vector(x,y);
    const direction = canvasToViewport(point);
    const color = TraceRay(origin, direction, 1, 1000);
    putPixel(point.x, point.y, color);
  }
}

updateCanvas();