class Vector {
  constructor(x = 0, y = 0, z = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
  }

  dot (u) {
    let { x, y, z } = this;
    return (x * u.x) + (y * u.y) + (z * u.z);
  }

  dotScalar (u) {
    let { x, y, z } = this;
    return new Vector(x * u, y * u, z * u);
  }

  subtract (u) {
    let { x, y, z } = this;
    return new Vector(x - u.x, y - u.y, z - u.z);
  }

  subtractPoint (u) {
    let { x, y, z } = this;
    return new Vector(x - u, y - u, z - u);
  }

  add (u) {
    let { x, y, z } = this;
    return new Vector(x + u.x, y + u.y, z + u.z);
  }

  addPoint (u) {
    let { x, y, z } = this;
    return new Vector(x + u, y + u, z + u);
  }

  vectorLength () {
    return Math.sqrt(this.dot(this));
  }

  log () {
    console.log(`[${this.x}, ${this.y}, ${this.z}]`);
  }
}

class Sphere {
  constructor (center, radious, specular, color = [0, 0, 0], reflective = 0.0) {
    this.center = center;
    this.radious = radious;
    this.color = color
    this.specular = specular;
    this.reflective = reflective;
  }
}

class Light {
  constructor(position, direction, intensity = 0.0, type = 'ambient') {
    this.type = type;
    this.intensity = intensity;
    this.position = position;
    this.direction = direction; // porcent 0.00 -> 1.00
  }
}

// Canvas configuration
const canvas = document.querySelector("#canvas");
const ctx = canvas.getContext("2d");
const canvasBuffer = ctx.getImageData(0, 0, canvas.width, canvas.height);
const canvasPitch = canvasBuffer.width * 4;
const BACKGROUND = new Vector(0, 0, 0);
const PROJECTION_Z = 1;
const recursion_depth = 3;

// Origin point of view, the camera lives here
const origin = new Vector(0, 0, 0);
// The inclination of the viewport and the distance (Z)
const viewport = new Vector(1, 1, 1); // viewport position in 3d space
// demo objects for the scene
const spheres = [
  new Sphere(
    new Vector(0, -1, 3),
    1,
    500,
    new Vector(255, 0, 0),
    0.2
  ),
  new Sphere(
    new Vector(2, 0, 4),
    1,
    500,
    new Vector(0, 0, 255),
    0.3
  ),
  new Sphere(
    new Vector(-2, 0, 4),
    1,
    10,
    new Vector(0, 255, 0),
    0.4
  ),
  new Sphere(
    new Vector(0, -5001, 0),
    5000,
    1000,
    new Vector(255, 255, 0),
    0.5
  ) // big yellow sphere
];

const lights = [
  new Light(null, null, 0.2),
  new Light(new Vector(2,1,0), null, 0.6, 'point'),
  new Light(null, new Vector(1,4,4), 0.2, 'directional')
];

function updateCanvas () {
  ctx.putImageData(canvasBuffer, 0, 0)
}

function putPixel (x, y, color) {
  x = canvas.width / 2 + x;
  y = canvas.height / 2 - y - 1;

  if (x < 0 || x >= canvas.width || y < 0 || y >= canvas.height) {
    return;
  }

  var offset = 4 * x + canvasPitch * y;
  canvasBuffer.data[offset++] = color.x;
  canvasBuffer.data[offset++] = color.y;
  canvasBuffer.data[offset++] = color.z;
  canvasBuffer.data[offset++] = 255; // Alpha = 255 (full opacity)
}

function canvasToViewport (vec) {
  return new Vector(
    vec.x * viewport.x / canvas.width,
    vec.y * viewport.y / canvas.height,
    PROJECTION_Z
  );
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

function reflectRay (R, N) {
  return N
    .dotScalar(N.dot(R))
    .dotScalar(2)
    .subtract(R);
}

function computeLighting(P, N, V, s) {
  let i = 0.0;
  let max = 1;
  lights.forEach(light => {
    if (light.type === 'ambient') {
      i += light.intensity;
    } else {
      let L;
      let R;
      if (light.type === 'point') {
        L = light.position.subtract(P);
        max = 1;
      } else {
        L = light.direction;
        max = Infinity;
      }

      // looks for intersactions to display shadow
      const {
        closest_sphere: shadowSphere
      } = closestIntersection(P, L, 0.001, max); // min should be less than zero to avoid intercepts itself
      if (!shadowSphere) {
        // diffuse calculation
        let n_dot_1 = N.dot(L);
        if (n_dot_1 > 0) {
          i += (n_dot_1 * light.intensity) / (N.vectorLength() * L.vectorLength());
        }
  
        // specular calculation
        if (s != -1) {
          R = reflectRay(L, N);
          let r_dot_v = R.dot(V);
          if (r_dot_v > 0) {
            i += light.intensity * Math.pow(r_dot_v / (R.vectorLength() * V.vectorLength()), s);
          }
        }
      }
    }
  });
  return i;
}

function closestIntersection(origin, direction, min, max) {
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
  return { closest_sphere, closest_t };
}

function between (value, min, max) {
  return value >= min && value <= max
}

function traceRay (origin, direction, min, max, recursionDepth) {
  const {
    closest_sphere,
    closest_t
  } = closestIntersection(origin, direction, min, max)
  
  if (!closest_sphere) {
    return BACKGROUND;
  }

  // calculate lights with color
  let P = origin.add(
    direction.dotScalar(closest_t)
  );
  
  let N = P.subtract(closest_sphere.center);
  let nLength = N.vectorLength();
  N = N.dotScalar((1/nLength))

  const light = computeLighting(P, N, direction.dotScalar(-1), closest_sphere.specular);
  const localColor = closest_sphere.color.dotScalar(light);

  // calculate recursion between reflections
  const r = closest_sphere.reflective;
  if (recursionDepth <= 0 || r <= 0) {
    return localColor;
  }

  // compute reflection
  let R = reflectRay(direction.dotScalar(-1), N);
  let reflectedColor = traceRay(P, R, 0.001, Infinity, recursionDepth - 1);
  return localColor
    .dotScalar(1 - r)
    .add(
      reflectedColor.dotScalar(r)
    );
}

for (let x = -canvas.width / 2; x < canvas.width / 2; x++) {
  for (let y = -canvas.height / 2; y < canvas.height / 2; y++) {
    const point = new Vector(x,y);
    const direction = canvasToViewport(point);
    const color = traceRay(origin, direction, 1, 1000, 3);
    putPixel(point.x, point.y, color);
  }
}

updateCanvas();