const airDensity = 1.225; //kg/m^3
const rollingResistanceCoefficient = 0.015; // typical value for car tires
const g = 9.81; // m/s^2
const detailsText = document.getElementById("details");
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// The car's speed (curCar.speed) is real m/s and drives all the physics
// and the km/h readout untouched. This is purely a "meters to pixels"
// scale for how far the sprite travels on screen per second — bump it
// up if the car still looks too slow crossing the canvas, even though
// its actual speed/physics haven't changed.
const pixelsPerMeter = 10;

const carState = {
  x: 200,
  y: 350,
  rotation: 0.25, // heading the car's NOSE points — driven by steering input
  velocityAngle: 0.25, // direction the car is ACTUALLY moving — lags behind
  // heading when tire grip can't keep up (this gap is the "slip")
  width: 70,
  height: 35,
};

// Shortest signed angle from b to a, wrapped to (-PI, PI]
function angleDiff(a, b) {
  let d = (a - b) % (2 * Math.PI);
  if (d > Math.PI) d -= 2 * Math.PI;
  if (d < -Math.PI) d += 2 * Math.PI;
  return d;
}

function drawControls() {
  const lines = [
    "W - Throttle",
    "S - Brake",
    "A / D - Steer",
    "Space - Handbrake",
    "Up / Down - Shift gear",
  ];
  const padding = 10;
  const lineHeight = 18;
  const boxWidth = 160;
  const boxHeight = padding * 2 + lines.length * lineHeight;

  ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
  ctx.fillRect(10, 10, boxWidth, boxHeight);

  ctx.fillStyle = "#fff";
  ctx.font = "13px sans-serif";
  ctx.textBaseline = "top";
  lines.forEach((line, i) => {
    ctx.fillText(line, 10 + padding, 10 + padding + i * lineHeight);
  });
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  drawControls();

  ctx.save();
  ctx.translate(carState.x, carState.y);
  ctx.rotate(carState.rotation);

  // car body
  ctx.fillStyle = "#d11a1a";
  ctx.fillRect(
    -carState.width / 2,
    -carState.height / 2,
    carState.width,
    carState.height,
  );

  // roof / cabin
  ctx.fillStyle = "#ad1414";
  ctx.fillRect(
    carState.width * 0.35,
    -carState.height * 0.5,
    carState.width * 0.14,
    carState.height * 1,
  );

  // wheels
  ctx.fillStyle = "#111";
  const wheelOffsetX = carState.width * 0.35;
  const wheelOffsetY = carState.height * 0.5;
  const wheelSize = carState.height * 0.24;

  ctx.fillRect(-wheelOffsetX, -wheelOffsetY, wheelSize, wheelSize * 0.7);
  ctx.fillRect(
    wheelOffsetX - wheelSize,
    -wheelOffsetY,
    wheelSize,
    wheelSize * 0.7,
  );
  ctx.fillRect(
    -wheelOffsetX,
    wheelOffsetY - wheelSize * 0.7,
    wheelSize,
    wheelSize * 0.7,
  );
  ctx.fillRect(
    wheelOffsetX - wheelSize,
    wheelOffsetY - wheelSize * 0.7,
    wheelSize,
    wheelSize * 0.7,
  );

  ctx.restore();
}

const CarTypes = {
  Miata_MX5_1992: {
    weight: 960,
    dragCoefficient: 0.38,
    hp: 116,
    frontalArea: 1.71,
    WheelSize: 14,
    redlineRPM: 7000,
    finalDrive: 4.3,
    gears: [0, 3.13, 1.88, 1.33, 1.0, 0.814],
    torque: 135,
    breakPower: 1.2,
    gripFactor: 0.85, // narrower tires, less grip = more slip
  },
  BMW_M3_E46: {
    weight: 1550,
    dragCoefficient: 0.32,
    hp: 333,
    frontalArea: 2,
    WheelSize: 18,
    redlineRPM: 8000,
    finalDrive: 3.62,
    gears: [0, 4.23, 2.53, 1.67, 1.23, 1.0, 0.83],
    torque: 365,
    breakPower: 2.0,
    gripFactor: 1.0, // baseline grip
  },
  Porsche_718_Cayman_GT4_RS: {
    weight: 1415,
    dragCoefficient: 0.33,
    hp: 493,
    frontalArea: 2,
    WheelSize: 20,
    redlineRPM: 9000,
    finalDrive: 4.17,
    gears: [0, 3.91, 2.29, 1.65, 1.3, 1.08, 0.88, 0.71],
    torque: 450,
    breakPower: 2.4,
    gripFactor: 1.8, // sticky track tires = more grip, less slip
  },
  koenigsegg_jesko: {
    weight: 1420,
    dragCoefficient: 0.33,
    hp: 1280,
    frontalArea: 2,
    WheelSize: 20,
    redlineRPM: 8500,
    finalDrive: 3.91,
    gears: [0, 3.91, 2.29, 1.65, 1.3, 1.08, 0.88, 0.71],
    torque: 1100,
    breakPower: 3,
    gripFactor: 2.1, // wide tires, but huge power to fight
  },
  Toyota_Supra_A90: {
    weight: 1570,
    dragCoefficient: 0.3,
    hp: 382,
    frontalArea: 2.0,
    WheelSize: 19,
    redlineRPM: 7000,
    finalDrive: 3.15,
    gears: [0, 4.171, 2.317, 1.521, 1.143, 1.0, 0.851],
    torque: 500,
    breakPower: 2.1,
    gripFactor: 1.15,
  },
  Nissan_GTR_R35: {
    weight: 1752,
    dragCoefficient: 0.26,
    hp: 565,
    frontalArea: 2.0,
    WheelSize: 20,
    redlineRPM: 7100,
    finalDrive: 3.7,
    gears: [0, 4.056, 2.423, 1.474, 1.0, 0.837, 0.71],
    torque: 633,
    breakPower: 2.3,
    gripFactor: 1.4, // AWD, huge grip
  },
  Honda_Civic_TypeR_FL5: {
    weight: 1429,
    dragCoefficient: 0.33,
    hp: 315,
    frontalArea: 2.0,
    WheelSize: 19,
    redlineRPM: 7000,
    finalDrive: 4.111,
    gears: [0, 3.267, 2.13, 1.517, 1.147, 0.921, 0.738],
    torque: 420,
    breakPower: 1.9,
    gripFactor: 1.1,
  },
  Ford_Mustang_GT_S550: {
    weight: 1740,
    dragCoefficient: 0.35,
    hp: 460,
    frontalArea: 2.2,
    WheelSize: 19,
    redlineRPM: 7000,
    finalDrive: 3.55,
    gears: [0, 3.66, 2.43, 1.69, 1.32, 1.0, 0.65],
    torque: 569,
    breakPower: 2.0,
    gripFactor: 0.95, // RWD muscle car, less planted than the others
  },
  Subaru_WRX_STI: {
    weight: 1568,
    dragCoefficient: 0.35,
    hp: 310,
    frontalArea: 2.1,
    WheelSize: 19,
    redlineRPM: 6700,
    finalDrive: 3.9,
    gears: [0, 3.636, 2.375, 1.761, 1.346, 1.0, 0.767],
    torque: 393,
    breakPower: 1.8,
    gripFactor: 1.25, // AWD rally-bred grip
  },
};

const idleRPM = 900;
const revLimiterPercentage = 0.98;
const throttleDeadSpace = 0.03;

// Steering authority drops off as speed increases, like a real car —
// you can spin the wheel lock-to-lock in a parking lot, but at speed
// even a small input has to be gentler or you lose the back end.
const baseSteerRate = 2.2; // rad/sec of steering input at low speed
const steerSpeedScale = 20; // m/s (~72km/h) — speed at which authority starts dropping
// how much extra steering authority the handbrake gives you, since a
// real handbrake turn unloads the rear tires and lets the nose (and
// tail) swing much more freely than normal grip-limited steering does
const handbrakeSteerBoost = 2.2;

// Tire grip: how fast the car's actual direction of travel can be
// dragged toward the direction it's pointed. At low speed/gentle
// steering the tires keep up almost instantly. At high speed the grip
// can't redirect that much momentum as quickly, so the car's path lags
// behind its nose — that gap between "rotation" (heading) and
// "velocityAngle" (actual travel direction) IS the tire slip.
// These two are GLOBAL baselines (tuned down so slip is subtler
// overall); each car's own "gripFactor" (set in CarTypes / the Car
// constructor) then scales grip up or down per-car from there.
const baseGripRate = 12; // 1/sec, how fast tires correct slip at low speed
const gripSpeedScale = 40; // m/s — grip drops off past this speed

class Car {
  pressThrottle() {
    this.throttleTarget = Math.min(this.throttleTarget + 0.08, 1);
  }

  releaseThrottle() {
    this.throttleTarget = Math.max(this.throttleTarget - 0.01, 0);
    if (this.throttleTarget < throttleDeadSpace) {
      this.throttleTarget = 0;
    }
  }

  gearUp() {
    if (this.gear < this.numOfGears - 1) {
      this.gear++;
      this.curGearRatio = this.gears[this.gear] * this.finalDriveRatio;
    }
  }

  handbreakOn() {
    this.brakingResistance = this.breakPower / 2;
    this.gripFactor = this.gripFactor * 0.1; // reduce grip when handbrake is on
  }

  handbreakOff() {
    this.brakingResistance = 0;
    this.gripFactor = this.gripFactor / 0.1; // restore grip when handbrake is off
  }

  gearDown() {
    if (this.gear > 0) {
      this.gear--;
      this.curGearRatio = this.gears[this.gear] * this.finalDriveRatio;
    }
  }

  resist() {
    this.drag =
      0.5 *
      airDensity *
      this.dragCoefficient *
      this.frontalArea *
      this.speed ** 2;
    this.acceleration -= Math.sign(this.speed) * (this.drag / this.weight);

    this.rollingResistance =
      this.speed !== 0
        ? (rollingResistanceCoefficient + this.brakingResistance) *
          this.weight *
          g
        : 0;
    this.acceleration -=
      Math.sign(this.speed) * (this.rollingResistance / this.weight);
  }

  drive() {
    const revLimiterCut =
      this.rpm >= revLimiterPercentage * this.redlineRPM ? 0 : 1;
    const engineTorque =
      revLimiterCut *
      this.torque *
      this.throttle *
      (this.rpm / this.redlineRPM);
    const wheelTorque = this.gear === 0 ? 0 : engineTorque * this.curGearRatio;
    const wheelForce = wheelTorque / this.wheelRadius;

    this.acceleration = wheelForce / this.weight;
    this.resist();
    this.speed += this.acceleration * (1 / 30);
  }

  brake() {
    this.brakingResistance = Math.min(
      this.breakPower,
      this.brakingResistance + 0.03,
    );
  }

  stopBraking() {
    this.brakingResistance = 0;
  }

  // Current grip rate (1/sec) at this car's current speed — combines
  // the global baseline/falloff with this car's own gripFactor. Higher
  // = tires correct the heading/travel-direction gap faster = less slip.
  currentGripRate() {
    return (
      (baseGripRate * this.gripFactor) /
      (1 + (this.speed / gripSpeedScale) ** 2)
    );
  }

  constructor(
    weight,
    power,
    dragCoefficient,
    frontalArea,
    WheelSize,
    redlineRPM,
    gears,
    finalDriveRatio,
    torque,
    breakPower,
    gripFactor, // tunable per-car: >1 = more grip/less slip, <1 = slipperier
  ) {
    this.weight = weight;
    this.power = power;
    this.dragCoefficient = dragCoefficient;
    this.frontalArea = frontalArea;
    this.wheelRadius = (WheelSize * 0.0254) / 2;
    this.redlineRPM = redlineRPM;
    this.gears = gears;
    this.finalDriveRatio = finalDriveRatio;
    this.torque = torque;
    this.breakPower = breakPower;
    this.gripFactor = gripFactor;
    this.speed = 0;
    this.throttle = 0;
    this.throttleTarget = 0;
    this.acceleration = 0;
    this.rollingResistance = 0;
    this.drag = 0;
    this.rpm = 0;
    this.gear = 0;
    this.curGearRatio = this.gears[this.gear] * this.finalDriveRatio;
    this.numOfGears = gears.length;
    this.wheelRPM = 0;
    this.brakingResistance = 0;
  }
}

function createCar(typeKey) {
  const spec = CarTypes[typeKey];
  return new Car(
    spec.weight,
    spec.hp,
    spec.dragCoefficient,
    spec.frontalArea,
    spec.WheelSize,
    spec.redlineRPM,
    spec.gears,
    spec.finalDrive,
    spec.torque,
    spec.breakPower,
    spec.gripFactor,
  );
}

let curCar = createCar("Porsche_718_Cayman_GT4_RS");

const carSelect = document.getElementById("carSelect");
Object.keys(CarTypes).forEach((key) => {
  const option = document.createElement("option");
  option.value = key;
  option.textContent = key.replace(/_/g, " ");
  carSelect.appendChild(option);
});
carSelect.value = "Porsche_718_Cayman_GT4_RS";

carSelect.addEventListener("change", (event) => {
  // swap in a fresh Car instance for the picked type — resets speed,
  // throttle, rpm, gear, etc. On-screen position/heading (carState)
  // is untouched so the sprite doesn't jump around on selection.
  curCar = createCar(event.target.value);
});

const keysHeld = new Set();
document.addEventListener("keydown", (e) => keysHeld.add(e.key));
document.addEventListener("keyup", (e) => keysHeld.delete(e.key));

document.addEventListener("keydown", (event) => {
  if (event.code === "ArrowDown" && !event.repeat) curCar.gearDown();
});

document.addEventListener("keydown", (event) => {
  if (event.code === "ArrowUp" && !event.repeat) curCar.gearUp();
});

document.addEventListener("keydown", (event) => {
  if (event.code === "Space" && !event.repeat) curCar.handbreakOn();
});

document.addEventListener("keyup", (event) => {
  if (event.code === "Space" && !event.repeat) curCar.handbreakOff();
});

const loop = () => {
  if (keysHeld.has("s")) {
    curCar.throttleTarget = 0;
    curCar.brake();
  } else {
    if (keysHeld.has("w")) {
      curCar.throttleTarget = Math.min(curCar.throttleTarget + 0.08, 1);
    } else {
      curCar.throttleTarget = Math.max(curCar.throttleTarget - 0.01, 0);
    }
    // don't clear the handbrake's braking force every frame just
    // because "s" isn't held — only stop braking if the handbrake
    // (spacebar) isn't held either
    if (!keysHeld.has(" ")) {
      curCar.stopBraking();
    }
  }
  curCar.throttle += (curCar.throttleTarget - curCar.throttle) * 0.12;
  curCar.throttle = Math.min(1, Math.max(0, curCar.throttle));

  let rpmTarget;
  if (curCar.gear === 0) {
    rpmTarget = idleRPM + curCar.throttle * (curCar.redlineRPM - idleRPM);
    curCar.rpm += (rpmTarget - curCar.rpm) * 0.1;
  } else {
    curCar.wheelRPM = (curCar.speed / (2 * Math.PI * curCar.wheelRadius)) * 60;
    rpmTarget = Math.max(idleRPM, curCar.wheelRPM * curCar.curGearRatio);
    curCar.rpm = rpmTarget;
  }

  if (curCar.rpm >= revLimiterPercentage * curCar.redlineRPM) {
    curCar.rpm -= 0.02 * curCar.redlineRPM;
  }

  curCar.drive();

  if (curCar.speed < 0) curCar.speed = 0;
  if (!Number.isFinite(curCar.speed)) curCar.speed = 0;
  if (!Number.isFinite(curCar.acceleration)) curCar.acceleration = 0;

  // --- steering: speed-dependent authority, boosted by the handbrake ---
  // more rad/sec of turning at low speed, tapering off at high speed;
  // holding the handbrake unloads the rear tires so a given amount of
  // steering input swings the nose/tail much more freely than normal
  if (curCar.speed > 0.05) {
    const handbrakeBoost = keysHeld.has(" ") ? handbrakeSteerBoost : 1;
    const effectiveSteerRate =
      (baseSteerRate * handbrakeBoost) / (1 + curCar.speed / steerSpeedScale);
    if (keysHeld.has("a")) carState.rotation -= effectiveSteerRate * (1 / 30);
    if (keysHeld.has("d")) carState.rotation += effectiveSteerRate * (1 / 30);
  }

  // --- tire slip: the car's actual travel direction lags behind its
  // heading, scaled by this car's own gripFactor (see currentGripRate) ---
  const slip = angleDiff(carState.rotation, carState.velocityAngle);
  const gripRate = curCar.currentGripRate();
  carState.velocityAngle += slip * Math.min(1, gripRate * (1 / 30));

  const carSpeedKmh = curCar.speed * 3.6;
  const slipDeg = Math.abs(slip * (180 / Math.PI));
  detailsText.innerText = `Speed: ${carSpeedKmh.toFixed(2)} km/h.
  Acceleration: ${curCar.acceleration.toFixed(2)} m/s^2.
  Throttle: ${curCar.throttle.toFixed(2)}
  Rpm: ${curCar.rpm.toFixed(0)}
  Gear: ${curCar.gear == 0 ? "N" : curCar.gear}
  Tire slip: ${slipDeg.toFixed(1)} deg
  Handbrake: ${curCar.brakingResistance > 0 ? "ON" : "OFF"}`;

  draw();
};

const updateCar = () => {
  // moves along velocityAngle (where the tires actually have grip),
  // not carState.rotation (where the nose is pointed) — that gap is
  // what makes the car slide instead of instantly snapping direction.
  // pixelsPerMeter scales real-world speed up to a faster-looking
  // on-screen crawl rate without touching the actual car physics.
  carState.x +=
    curCar.speed * pixelsPerMeter * Math.cos(carState.velocityAngle) * (1 / 30);
  carState.y +=
    curCar.speed * pixelsPerMeter * Math.sin(carState.velocityAngle) * (1 / 30);

  draw();
};

const targetFPS = 30;
const frameInterval = 1000 / targetFPS;

let lastFrameTime = performance.now();

function animate(currentTime) {
  requestAnimationFrame(animate);

  const deltaTime = currentTime - lastFrameTime;

  if (deltaTime < frameInterval) {
    return;
  }

  lastFrameTime = currentTime - (deltaTime % frameInterval);
  loop();
  updateCar();
}

requestAnimationFrame(animate);
