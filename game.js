const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const p1HealthEl = document.getElementById("p1-health");
const p2HealthEl = document.getElementById("p2-health");
const stateEl = document.getElementById("state");

const WIDTH = canvas.width;
const HEIGHT = canvas.height;
const GROUND_Y = HEIGHT - 82;
const GRAVITY = 0.58;
const MOVE_SPEED = 3.7;
const JUMP_FORCE = -12.2;

const keysDown = new Set();

function makePlayer(options) {
  return {
    id: options.id,
    name: options.name,
    x: options.x,
    y: GROUND_Y - 64,
    w: 40,
    h: 64,
    vx: 0,
    vy: 0,
    facing: options.facing,
    onGround: true,
    health: 100,
    colorBody: options.colorBody,
    colorFace: options.colorFace,
    colorAccent: options.colorAccent,
    jumpQueued: false,
    attackTimer: 0,
    attackCooldown: 0,
    attackHitDone: false,
    hurtTimer: 0,
    ko: false,
    blocking: false,
  };
}

const player1 = makePlayer({
  id: 1,
  name: "Player 1",
  x: 180,
  facing: 1,
  colorBody: "#60a5fa",
  colorFace: "#dbeafe",
  colorAccent: "#1d4ed8",
});

const player2 = makePlayer({
  id: 2,
  name: "Player 2",
  x: WIDTH - 220,
  facing: -1,
  colorBody: "#f97316",
  colorFace: "#ffedd5",
  colorAccent: "#9a3412",
});

const game = {
  over: false,
  winner: "",
};

function resetRound() {
  Object.assign(player1, makePlayer({
    id: 1,
    name: "Player 1",
    x: 180,
    facing: 1,
    colorBody: "#60a5fa",
    colorFace: "#dbeafe",
    colorAccent: "#1d4ed8",
  }));

  Object.assign(player2, makePlayer({
    id: 2,
    name: "Player 2",
    x: WIDTH - 220,
    facing: -1,
    colorBody: "#f97316",
    colorFace: "#ffedd5",
    colorAccent: "#9a3412",
  }));

  game.over = false;
  game.winner = "";
  stateEl.textContent = "Fight! Press Enter after a KO for rematch.";
  updateHud();
}

function updateHud() {
  p1HealthEl.textContent = String(Math.max(0, Math.round(player1.health)));
  p2HealthEl.textContent = String(Math.max(0, Math.round(player2.health)));
}

function isHit(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function getAttackBox(player) {
  const width = 26;
  const x = player.facing === 1 ? player.x + player.w : player.x - width;
  const y = player.y + 14;
  return { x, y, w: width, h: 30 };
}

function startAttack(attacker) {
  if (attacker.attackCooldown > 0 || attacker.attackTimer > 0 || attacker.ko) {
    return;
  }
  attacker.attackTimer = 13;
  attacker.attackCooldown = 23;
  attacker.attackHitDone = false;
}

function takeHit(defender, attacker) {
  if (defender.blocking && defender.onGround) {
    defender.health -= 3;
    defender.hurtTimer = 4;
    defender.vx = attacker.facing * 1.1;
    defender.vy = -1.2;
  } else {
    defender.health -= 12;
    defender.hurtTimer = 10;
    defender.vx = attacker.facing * 3.4;
    defender.vy = -3.3;
  }

  if (defender.health <= 0) {
    defender.ko = true;
    defender.health = 0;
    game.over = true;
    game.winner = attacker.name;
    stateEl.textContent = `${attacker.name} wins! Press Enter to rematch.`;
  }

  updateHud();
}

function updatePlayer(player, leftKey, rightKey) {
  player.blocking = false;
  if (player.id === 1 && keysDown.has("KeyR") && !player.ko) {
    player.blocking = true;
  }
  if (player.id === 2 && keysDown.has("KeyL") && !player.ko) {
    player.blocking = true;
  }

  if (player.ko) {
    player.vx *= 0.9;
  } else {
    player.vx = 0;
    if (!player.blocking && keysDown.has(leftKey)) {
      player.vx = -MOVE_SPEED;
      player.facing = -1;
    }
    if (!player.blocking && keysDown.has(rightKey)) {
      player.vx = MOVE_SPEED;
      player.facing = 1;
    }
  }

  if (player.jumpQueued && player.onGround && !player.ko && !player.blocking) {
    player.vy = JUMP_FORCE;
    player.onGround = false;
  }
  player.jumpQueued = false;

  player.vy += GRAVITY;

  player.x += player.vx;
  player.y += player.vy;

  if (player.x < 20) player.x = 20;
  if (player.x + player.w > WIDTH - 20) player.x = WIDTH - 20 - player.w;

  if (player.y + player.h >= GROUND_Y) {
    player.y = GROUND_Y - player.h;
    player.vy = 0;
    player.onGround = true;
  }

  if (player.attackCooldown > 0) player.attackCooldown -= 1;
  if (player.attackTimer > 0) player.attackTimer -= 1;
  if (player.hurtTimer > 0) player.hurtTimer -= 1;
}

function updateCombat(attacker, defender) {
  if (attacker.attackTimer <= 0 || attacker.attackHitDone || game.over) {
    return;
  }

  const activeNow = attacker.attackTimer <= 8 && attacker.attackTimer >= 4;
  if (!activeNow) {
    return;
  }

  if (isHit(getAttackBox(attacker), defender)) {
    attacker.attackHitDone = true;
    takeHit(defender, attacker);
  }
}

function update() {
  updatePlayer(player1, "KeyA", "KeyD");
  updatePlayer(player2, "ArrowLeft", "ArrowRight");

  if (!game.over) {
    updateCombat(player1, player2);
    updateCombat(player2, player1);

    if (isHit(player1, player2)) {
      const push = player1.x < player2.x ? 1.5 : -1.5;
      player1.x -= push;
      player2.x += push;
    }
  }
}

function drawBg() {
  ctx.fillStyle = "#0b1224";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.fillStyle = "#111a34";
  ctx.fillRect(0, HEIGHT - 180, WIDTH, 100);

  ctx.fillStyle = "#1f2937";
  ctx.fillRect(0, GROUND_Y, WIDTH, HEIGHT - GROUND_Y);

  ctx.fillStyle = "#334155";
  for (let x = 0; x < WIDTH; x += 42) {
    ctx.fillRect(x, GROUND_Y + 20, 24, 8);
  }
}

function drawHealthBars() {
  const barW = 320;
  const barH = 22;

  ctx.fillStyle = "#0f172a";
  ctx.fillRect(28, 26, barW, barH);
  ctx.fillRect(WIDTH - 28 - barW, 26, barW, barH);

  ctx.fillStyle = "#22c55e";
  ctx.fillRect(28, 26, (player1.health / 100) * barW, barH);

  ctx.fillStyle = "#22c55e";
  const p2W = (player2.health / 100) * barW;
  ctx.fillRect(WIDTH - 28 - p2W, 26, p2W, barH);

  ctx.strokeStyle = "#e5eef7";
  ctx.lineWidth = 3;
  ctx.strokeRect(28, 26, barW, barH);
  ctx.strokeRect(WIDTH - 28 - barW, 26, barW, barH);
}

function drawFighter(player) {
  const x = Math.round(player.x);
  const y = Math.round(player.y);

  if (player.hurtTimer > 0 && player.hurtTimer % 2 === 0) {
    ctx.fillStyle = "#f43f5e";
  } else {
    ctx.fillStyle = player.colorBody;
  }

  ctx.fillRect(x, y, player.w, player.h);

  ctx.fillStyle = player.colorFace;
  ctx.fillRect(x + 8, y + 10, 8, 8);
  ctx.fillRect(x + 24, y + 10, 8, 8);

  ctx.fillStyle = player.colorAccent;
  ctx.fillRect(x + 9, y + 24, 22, 5);
  ctx.fillRect(x + 10, y + 36, 20, 8);

  if (player.blocking) {
    const shieldX = player.facing === 1 ? x + player.w : x - 8;
    ctx.fillStyle = "#93c5fd";
    ctx.fillRect(shieldX, y + 14, 8, 34);
  }

  if (player.attackTimer > 0) {
    const box = getAttackBox(player);
    ctx.fillStyle = "#facc15";
    ctx.fillRect(Math.round(box.x), Math.round(box.y), box.w, box.h);
  }
}

function drawKoBanner() {
  if (!game.over) {
    return;
  }

  ctx.fillStyle = "rgba(0, 0, 0, 0.52)";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.fillStyle = "#fbbf24";
  ctx.font = "32px 'Courier New', monospace";
  ctx.fillText("K.O.", WIDTH / 2 - 45, HEIGHT / 2 - 24);

  ctx.fillStyle = "#e5eef7";
  ctx.font = "20px 'Courier New', monospace";
  ctx.fillText(`${game.winner} wins`, WIDTH / 2 - 90, HEIGHT / 2 + 16);
}

function render() {
  drawBg();
  drawHealthBars();
  drawFighter(player1);
  drawFighter(player2);
  drawKoBanner();
}

function loop() {
  update();
  render();
  requestAnimationFrame(loop);
}

window.addEventListener("keydown", (event) => {
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(event.code)) {
    event.preventDefault();
  }

  keysDown.add(event.code);

  if (event.code === "KeyW") player1.jumpQueued = true;
  if (event.code === "ArrowUp") player2.jumpQueued = true;

  if (event.code === "KeyE") startAttack(player1);
  if (event.code === "KeyK") startAttack(player2);

  if (event.code === "Enter" && game.over) {
    resetRound();
  }
});

window.addEventListener("keyup", (event) => {
  keysDown.delete(event.code);
});

resetRound();
loop();
