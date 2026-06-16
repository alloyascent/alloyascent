// --- CONFIGURATION ---
const CONFIG = {
    gravity: 0.6,          
    jumpVelocity: -10,     // Slightly lower since we have double jump
    groundY: 350,          
    playerSize: 30,        // Smaller player!
    playerStartX: 100,     
    scrollSpeed: 6,
    obstacleSpawnRate: 90,
    pointsPerTier: 250
};

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

let player = {
    x: CONFIG.playerStartX,
    y: CONFIG.groundY - CONFIG.playerSize,
    width: CONFIG.playerSize,
    height: CONFIG.playerSize,
    velocityY: 0,
    isGrounded: true,
    jumpsRemaining: 2,     // Double jump!
    rotation: 0            // Spinning mechanics
};

let groundOffset = 0;
let obstacles = [];
let particles = [];
let frameCount = 0;
let score = 0;
let isDead = false;
let shakeFrames = 0;

// THE PROGRESSION LADDER (More Vibrant!)
const TIERS = [
    { name: "Raw Copper", color: "#ff8c42", glow: "transparent", particles: 0, spins: false },
    { name: "Bronze",     color: "#ffaa33", glow: "transparent", particles: 0, spins: true },
    { name: "Sterling Silver", color: "#e8f4f8", glow: "#ffffff", particles: 1, spins: true },
    { name: "Rose Gold",  color: "#ff8da1", glow: "#ffb6c1", particles: 2, spins: true },
    { name: "24k Gold",   color: "#ffe600", glow: "#ffcc00", particles: 3, spins: true },
    { name: "Platinum",   color: "#d6eaff", glow: "#ffffff", particles: 4, spins: true },
    { name: "Rhodium",    color: "#00ffff", glow: "#00ffff", particles: 5, spins: true },
    { name: "Rhenium",    color: "#ff5500", glow: "#ff3300", particles: 8, isSparky: true, spins: true },
    { name: "Osmium",     color: "#3388ff", glow: "#4488ff", particles: 6, screenShake: true, spins: true }
];

function getCurrentTier() {
    let index = Math.floor(score / CONFIG.pointsPerTier);
    if (index >= TIERS.length) index = TIERS.length - 1;
    return TIERS[index];
}

function resetGame() {
    player.y = CONFIG.groundY - CONFIG.playerSize;
    player.velocityY = 0;
    player.isGrounded = true;
    player.jumpsRemaining = 2;
    player.rotation = 0;
    obstacles = [];
    particles = [];
    frameCount = 0;
    score = 0;
    isDead = false;
    shakeFrames = 0;
}

function jump() {
    if (isDead) {
        resetGame();
        return;
    }
    if (player.jumpsRemaining > 0) {
        player.velocityY = CONFIG.jumpVelocity;
        player.isGrounded = false;
        player.jumpsRemaining--;
    }
}

// Input Listeners
window.addEventListener("keydown", (e) => {
    if (e.code === "Space") {
        e.preventDefault(); 
        jump();
    }
});
canvas.addEventListener("mousedown", jump);
canvas.addEventListener("touchstart", (e) => {
    e.preventDefault(); 
    jump();
});

function spawnObstacle() {
    const type = Math.floor(Math.random() * 3);
    let obs = { x: canvas.width, passed: false };
    
    if (type === 0) {
        obs.type = 'crucible';
        obs.width = 40;
        obs.height = 30;
        obs.y = CONFIG.groundY - obs.height;
    } else if (type === 1) {
        obs.type = 'ingot';
        obs.width = 50;
        obs.height = 60;
        obs.y = CONFIG.groundY - obs.height;
    } else {
        obs.type = 'tongs';
        obs.width = 40;
        obs.height = 160;
        obs.y = 0;
    }
    obstacles.push(obs);
}

function spawnParticles(tier) {
    if (tier.particles <= 0) return;
    
    // Determine particle color (sparks for Rhenium)
    let pColor = tier.isSparky ? (Math.random() > 0.5 ? "#ffcc00" : "#ff5500") : tier.glow;
    if (pColor === "transparent") return;

    for (let i = 0; i < tier.particles; i++) {
        // Emit from bottom of player
        particles.push({
            x: player.x + Math.random() * player.width,
            y: player.y + player.height - (Math.random() * 10),
            vx: (Math.random() - 0.5) * 3 - (CONFIG.scrollSpeed * 0.5),
            vy: Math.random() * 2 - 1,
            life: 1.0,
            color: pColor
        });
    }
}

function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        let p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.05;
        if (p.life <= 0) {
            particles.splice(i, 1);
        }
    }
}

function checkCollision(rect1, rect2) {
    return (
        rect1.x < rect2.x + rect2.width &&
        rect1.x + rect1.width > rect2.x &&
        rect1.y < rect2.y + rect2.height &&
        rect1.y + rect1.height > rect2.y
    );
}

function update() {
    if (isDead) return;

    let tier = getCurrentTier();
    let wasGrounded = player.isGrounded;

    player.velocityY += CONFIG.gravity;
    player.y += player.velocityY;

    let onPlatform = false;

    obstacles.forEach(obs => {
        if (obs.type === 'ingot') {
            if (player.velocityY > 0 && 
                player.y + player.height >= obs.y && 
                player.y + player.height - player.velocityY <= obs.y &&
                player.x + player.width > obs.x && 
                player.x < obs.x + obs.width) {
                
                player.y = obs.y - player.height;
                player.velocityY = 0;
                player.isGrounded = true;
                player.jumpsRemaining = 2; // Reset jumps!
                onPlatform = true;
            }
        }
    });

    if (player.y + player.height >= CONFIG.groundY) {
        player.y = CONFIG.groundY - player.height;
        player.velocityY = 0;
        player.isGrounded = true;
        player.jumpsRemaining = 2; // Reset jumps!
    } else if (!onPlatform) {
        player.isGrounded = false;
    }

    // Rotation mechanics
    if (!player.isGrounded && tier.spins) {
        player.rotation += 0.15; // Spin smoothly in air
    } else {
        // Snap to nearest 90 degrees (Math.PI/2) on landing
        player.rotation = Math.round(player.rotation / (Math.PI / 2)) * (Math.PI / 2);
    }

    // Trigger Screen Shake if landing on Osmium
    if (!wasGrounded && player.isGrounded && tier.screenShake) {
        shakeFrames = 15;
    }

    if (shakeFrames > 0) shakeFrames--;

    spawnParticles(tier);
    updateParticles();

    groundOffset -= CONFIG.scrollSpeed;
    if (groundOffset <= -canvas.width) {
        groundOffset = 0;
    }

    score += 1;
    frameCount++;

    if (frameCount % CONFIG.obstacleSpawnRate === 0) {
        spawnObstacle();
    }

    for (let i = obstacles.length - 1; i >= 0; i--) {
        let obs = obstacles[i];
        obs.x -= CONFIG.scrollSpeed;

        let hit = false;
        if (obs.type === 'crucible' || obs.type === 'tongs') {
            hit = checkCollision(player, obs);
        } else if (obs.type === 'ingot') {
            if (checkCollision(player, obs) && !onPlatform) {
                hit = true;
            }
        }

        if (hit) {
            isDead = true;
        }

        if (obs.x + obs.width < 0) {
            obstacles.splice(i, 1);
        }
    }
}

function draw() {
    ctx.save();
    if (shakeFrames > 0) {
        let dx = (Math.random() - 0.5) * 10;
        let dy = (Math.random() - 0.5) * 10;
        ctx.translate(dx, dy);
    }

    // Vault Background
    ctx.fillStyle = "#111418";
    ctx.fillRect(0, 0, canvas.width, CONFIG.groundY);

    // Horizon line
    ctx.shadowBlur = 20;
    ctx.shadowColor = "#ff4400";
    ctx.fillStyle = "#ff4400";
    ctx.fillRect(0, CONFIG.groundY - 2, canvas.width, 2);
    ctx.shadowBlur = 0;

    // Ground
    ctx.fillStyle = "#0a0a0c";
    ctx.fillRect(0, CONFIG.groundY, canvas.width, canvas.height - CONFIG.groundY);
    
    ctx.strokeStyle = "#222";
    ctx.lineWidth = 2;
    for(let i = 0; i < 20; i++) {
        let dashX = groundOffset + (i * 100);
        ctx.beginPath();
        ctx.moveTo(dashX, CONFIG.groundY);
        ctx.lineTo(dashX - 50, canvas.height); 
        ctx.stroke();
    }

    // Particles
    particles.forEach(p => {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, 4, 4);
    });
    ctx.globalAlpha = 1.0;

    // Obstacles
    obstacles.forEach(obs => {
        if (obs.type === 'crucible') {
            ctx.fillStyle = "#222";
            ctx.fillRect(obs.x, obs.y + 10, obs.width, obs.height - 10);
            ctx.shadowBlur = 15;
            ctx.shadowColor = "#ff2200";
            ctx.fillStyle = "#ff5500";
            ctx.fillRect(obs.x, obs.y, obs.width, 10);
            ctx.shadowBlur = 0;
        } else if (obs.type === 'ingot') {
            ctx.fillStyle = "#1a1a24";
            ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
            ctx.fillStyle = "#334";
            ctx.fillRect(obs.x, obs.y, obs.width, 5);
        } else if (obs.type === 'tongs') {
            ctx.fillStyle = "#333";
            ctx.fillRect(obs.x + 10, obs.y, 20, obs.height);
            ctx.fillStyle = "#888";
            ctx.fillRect(obs.x, obs.y + obs.height - 20, 15, 20);
            ctx.fillRect(obs.x + 25, obs.y + obs.height - 20, 15, 20);
        }
    });

    let tier = getCurrentTier();
    
    // Draw Player with Rotation & Vibrant Gradient
    ctx.save();
    // Move to center of player to rotate
    ctx.translate(player.x + player.width/2, player.y + player.height/2);
    ctx.rotate(player.rotation);

    if (tier.glow !== "transparent") {
        ctx.shadowBlur = 20;
        ctx.shadowColor = tier.glow;
    }
    
    // Gradient from top-left to bottom-right of the square
    let grad = ctx.createLinearGradient(-player.width/2, -player.height/2, player.width/2, player.height/2);
    grad.addColorStop(0, "#ffffff");
    grad.addColorStop(0.4, tier.color);
    grad.addColorStop(1, "#222222"); // Less black, more visible
    
    ctx.fillStyle = grad;
    ctx.fillRect(-player.width/2, -player.height/2, player.width, player.height);
    ctx.shadowBlur = 0; 
    ctx.restore(); // Restore from rotation

    // UI - Score
    ctx.fillStyle = "#fff";
    ctx.font = "bold 20px 'Helvetica Neue', sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("Distance: " + score + "m", 20, 35);

    // UI - Stage
    ctx.textAlign = "right";
    ctx.fillStyle = tier.color;
    ctx.shadowBlur = 10;
    ctx.shadowColor = tier.glow !== "transparent" ? tier.glow : tier.color;
    ctx.fillText("Stage: " + tier.name, canvas.width - 20, 35);
    ctx.shadowBlur = 0;

    // Death Screen
    if (isDead) {
        ctx.fillStyle = "rgba(10, 10, 15, 0.85)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = "#ff3333";
        ctx.textAlign = "center";
        ctx.font = "bold 48px 'Helvetica Neue', sans-serif";
        ctx.shadowBlur = 20;
        ctx.shadowColor = "#ff0000";
        ctx.fillText("MELTDOWN", canvas.width/2, canvas.height/2 - 20);
        ctx.shadowBlur = 0;
        
        ctx.fillStyle = "#fff";
        ctx.font = "24px sans-serif";
        ctx.fillText("Distance: " + score + "m", canvas.width/2, canvas.height/2 + 30);
        
        ctx.fillStyle = tier.color;
        ctx.fillText("Final Alloy: " + tier.name, canvas.width/2, canvas.height/2 + 65);
        
        ctx.font = "16px sans-serif";
        ctx.fillStyle = "#888";
        ctx.fillText("Click or Spacebar to Forge Again", canvas.width/2, canvas.height/2 + 105);
    }

    ctx.restore(); // Restore from screen shake
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

gameLoop();
