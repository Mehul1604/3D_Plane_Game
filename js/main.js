// GLOBAL VARIABLES
let scene , camera , renderer , cube , sphere
let player
let enemy = []
let rockets = []
let nazi_missiles = []
let stars = []
let clouds = []
let explosions = []
let earth
let TICKS = 0
let X_LEN = 14
let Z_LEN = 4.5
let LEFT_LIMIT = -7
let RIGHT_LIMIT = 7
let FORWARD_LIMIT = 3.5
let BACKWARD_LIMIT = 7
let id;


// Function to load a model from a file and return a promise
loadModel = (file) => {
    return new Promise(resolve => {
        return new THREE.GLTFLoader().load(file , resolve);
    })
    
}

// Function to detect collision fo two xz plae 2D rectangles
detect_collision = (hitbox1, hitbox2) => {
    return (Math.abs(hitbox1.x - hitbox2.x) * 2 < (hitbox1.width + hitbox2.width)) &&
           (Math.abs(hitbox1.z - hitbox2.z) * 2 < (hitbox1.depth + hitbox2.depth));
}

// The player (plane) class
class Player{
    constructor(position){
        // Loading the model
        let promise = loadModel('player.glb').then((res) => this.model = res.scene);

        // After model is loaded
        Promise.all([promise]).then(() => {
            scene.add(this.model);
            this.model.scale.set(0.3 , 0.3 , 0.3)
            this.model.rotation.y = Math.PI
            this.model.position.set(position.x , position.y , position.z);
            this.width = 1.8
            this.depth = 2.6
            this.hitBox = {
                x: this.model.position.x,
                z: this.model.position.z,
                width: this.width,
                depth: this.depth
            }
            this.speed = 0.1
            this.health = 20
            this.stars = 0
            this.dying = false
            
        });
    }

    // move sideways
    moveX(dir)
    {   
        // sideways boundary
        if((this.model.position.x + (dir * this.speed)) > LEFT_LIMIT && (this.model.position.x + (dir * this.speed)) < RIGHT_LIMIT)
        {
            this.model.position.x += (dir * this.speed)
            this.updateHitbox()
        }
            
    }

    // move front and back
    moveZ(dir)
    {   
        // front-back plane boundaries
        if((this.model.position.z + (dir * this.speed)) < BACKWARD_LIMIT && (this.model.position.z + (dir * this.speed)) > FORWARD_LIMIT)
        {
            this.model.position.z += (dir * this.speed)
            this.updateHitbox()
        }
            
    }

    // Tilt in respective direction

    tiltX(dir)
    {
        this.model.rotation.z = (dir * 0.15)
    }

    tiltZ(dir)
    {
        this.model.rotation.x = (dir * 0.15)
    }

    straighten()
    {
        this.model.rotation.x = 0
        this.model.rotation.z = 0
    }

    // update hitbox
    updateHitbox()
    {
        this.hitBox = {
            x: this.model.position.x,
            z: this.model.position.z,
            width: this.width,
            depth: this.depth
        }
    }

    // spawn a new rocket model and paste in array
    shootRockets()
    {
        let pos1 = new THREE.Vector3(this.model.position.x - 0.5 , 0 , this.model.position.z)
        let pos2 = new THREE.Vector3(this.model.position.x + 0.5 , 0 , this.model.position.z)
        let rocket1 = new Rocket(pos1)
        let rocket2 = new Rocket(pos2)
        rockets.push(rocket1)
        rockets.push(rocket2)
    }

    // when health reachs 0
    explode()
    {
        let pos = new THREE.Vector3(this.model.position.x , this.model.position.y , this.model.position.z)
        let new_explosion = new Explosion(pos)
        explosions.push(new_explosion)
    }
}

// The enemy class
class Enemy{
    constructor(position){
        let promise = loadModel('enemy.glb').then((res) => this.model = res.scene);
        Promise.all([promise]).then(() => {
            scene.add(this.model)
            this.model.scale.set(0.4 , 0.4 , 0.4)
            this.model.position.set(position.x , position.y , position.z)
            this.width = 1.4
            this.depth = 2.5
            this.hitBox = {
                x: this.model.position.x,
                z: this.model.position.z - 0.75,
                width: this.width,
                depth: this.depth
            }
            this.fastSpeed = 1
            this.speed = 0.07
            this.deleted = false
        })
    }

    move()
    {
        if(detect_collision(this.hitBox , player.hitBox))
        {
            //if it hits player
            player.health -= 3
            if(player.health <= 0)
            {
                // player health hits 0
                player.health = 0
                document.getElementById("lost").style.display = 'block'
                player.dying = true
                player.explode()
                setTimeout(() => location.reload() , 2000)
                
            }
            
            this.explode()
            this.deleted = true
        }
        else if(this.model.position.z > BACKWARD_LIMIT + 3)
        {
            this.deleted = true
        }
        else
        {
            if(this.model.position.z < -20)
                this.model.position.z += this.fastSpeed
            else
                this.model.position.z += this.speed
            
            this.model.rotation.z += 0.05
            this.updateHitbox()
        }
    }

    // spaw two missile models
    shootMissile(){
        let chance = Math.random()
        if(this.model.position.z > -20)
        {
            // if far from player
            if(this.model.position.z < -5)
            {
                if(chance <= 0.5)
                {
                    // choosig position of missile
                    let pos = new THREE.Vector3(this.model.position.x , this.model.position.y , this.model.position.z)
                    let missile = new NaziMissile(pos)
                    nazi_missiles.push(missile)
                    // console.log(nazi_missiles.length)
                }
            }
            else
            {
                // near player
                if(chance <= 0.15)
                {
                    let pos = new THREE.Vector3(this.model.position.x , this.model.position.y , this.model.position.z)
                    let missile = new NaziMissile(pos)
                    nazi_missiles.push(missile)
                }
            }
            
        }

    }

    // spawn a star model on dying
    spawnStar(){
        let chance = Math.random()
        if(chance <= 0.75)
        {
            let pos = new THREE.Vector3(this.model.position.x , this.model.position.y , this.model.position.z)
            let new_star = new Star(pos)
            stars.push(new_star)
        }

    }

    // spaen an explosion and stop being rendered in the scene
    explode(){
        let pos = new THREE.Vector3(this.model.position.x , this.model.position.y , this.model.position.z)
        let new_explosion = new Explosion(pos)
        explosions.push(new_explosion)
    }

    updateHitbox()
    {
        this.hitBox = {
            x: this.model.position.x,
            z: this.model.position.z - 0.75,
            width: this.width,
            depth: this.depth
        }
    }
}

// The rocket class
class Rocket{
    constructor(position){
        let promise = loadModel('rocket.glb').then((res) => this.model = res.scene)
        Promise.all([promise]).then(() => {
            scene.add(this.model)
            this.model.scale.set(0.08 , 0.08 , 0.08)   
            this.model.position.set(position.x , position.y , position.z)
            this.width = 0.2
            this.depth = 0.4
            this.hitBox = {
                x: this.model.position.x,
                z: this.model.position.z - this.depth/2,
                width: this.width,
                depth: this.depth
            }
            this.speed = 0.07
            this.deleted = false
        })
        
    }
    



    // check the collsion of hitboxes with the enemy , if yes then return true
    checkEnemyCollision()
    {
        
        for(var i = 0; i < enemy.length ; i+=1)
        {
            if(enemy[i].model != undefined)
            {
                if(!enemy[i].deleted)
                {
                    if(detect_collision(this.hitBox , enemy[i].hitBox))
                    {
                        enemy[i].deleted = true
                        enemy[i].spawnStar()
                        enemy[i].explode()
                        return true
                    
                    }
                }
            }
        }

        return false
    }
    move()
    {
        if(this.checkEnemyCollision())
        {
            
            this.deleted = true
        }
        else if(this.model.position.z < FORWARD_LIMIT - 5)
        {
            this.deleted = true
        }
        else
        {
            this.model.position.z -= this.speed
            this.model.rotation.z += 0.1 
            this.updateHitbox()
        }
    }

    updateHitbox()
    {
        this.hitBox = {
            x: this.model.position.x,
            z: this.model.position.z - this.depth/2,
            width: this.width,
            depth: this.depth
        }
    }
    
}

// Nazi missile class
class NaziMissile{
    constructor(position){
        let promise = loadModel('nazi_missile.glb').then((res) => this.model = res.scene);
        Promise.all([promise]).then(() => {
            scene.add(this.model)
            this.model.scale.set(0.08 , 0.08 , 0.08)
            this.model.rotation.set(0 , Math.PI , 0)
            this.model.position.set(position.x , position.y , position.z)
            this.width = 0.2
            this.depth = 0.4
            this.hitBox = {
                x: this.model.position.x,
                z: this.model.position.z,
                width: this.width,
                depth: this.depth
            }
            this.speed = 0.095
            this.deleted = false
        })
    }

    // check if player got hit with nazi missiles
    checkPlayerCollision()
    {
        if(detect_collision(player.hitBox , this.hitBox))
        {
            player.health -= 1
            if(player.health <= 0)
            {
                // player dies
                player.health = 0
                document.getElementById("lost").style.display = 'block'
                // cancelAnimationFrame( id );
                player.dying = true
                player.explode()
                // await sleep(2000)
                setTimeout(() => location.reload() , 2000)
                // location.reload()
            }
                
            return true
        }
        
        
        return false
    }

    move(){
        if(this.checkPlayerCollision())
        {
            
            this.deleted = true
        }
        if(this.model.position.z > BACKWARD_LIMIT + 3)
        {
            this.deleted = true
        }
        else
        {
            // console.log('nazi missile movin')
            this.model.position.z += this.speed 
            this.updateHitbox()
        }
    }

    updateHitbox()
    {
        this.hitBox = {
            x: this.model.position.x,
            z: this.model.position.z,
            width: this.width,
            depth: this.depth
        }
    }
}

// the Star class
class Star{
    constructor(position){
        let promise = loadModel('coin.glb').then((res) => this.model = res.scene);
        Promise.all([promise]).then(() => {
            scene.add(this.model)
            this.model.scale.set(0.15 , 0.15 , 0.15)
            this.model.position.set(position.x , position.y , position.z)
            this.width = 0.4
            this.depth = 0.2
            this.hitBox = {
                x: this.model.position.x,
                z: this.model.position.z,
                width: this.width,
                depth: this.depth
            }
            this.rangeBox = {
                x: this.model.position.x,
                z: this.model.position.z,
                width: this.width*3,
                depth: this.depth*3
            }
            this.speed = 0.07
            this.attractSpeed = 0.09
            this.deleted = false
        })
    }

    checkPlayerCollision()
    {
        // checking between player and star
        if(detect_collision(player.hitBox , this.hitBox))
        {
            // if yes then increase number of stars by one
            player.stars += 1
            if(player.stars%5 == 0)
            {
                // inrease health by 1 when it has 5 consecutive values
                if(player.health < 20)
                    player.health += 1
                    
            }
                
            return true
        }
            
        
        return false
    }

    // If player is in magnetic/circular range of S
    checkPlayerInRange()
    {
        if(detect_collision(player.hitBox , this.rangeBox))
            return true
        
            return false
    }

    move(){
        if(this.checkPlayerCollision())
        {
            this.deleted = true
        }
        if(this.model.position.z > BACKWARD_LIMIT + 3)
        {
            this.deleted = true
        }
        else
        {
            if(this.checkPlayerInRange())
            {
                let dirx
                let dirz
                if(player.model.position.x >= this.model.position.x)
                    dirx = 1
                else
                    dirx = -1
                
                if(player.model.position.z >= this.model.position.z)
                    dirz = 1
                else
                    dirz = -1
                
                this.model.position.x += (dirx * this.attractSpeed)
                this.model.position.z += (dirz * this.attractSpeed)
            }
            else
                this.model.position.z += this.speed 
            
            this.model.rotation.y += 0.1
            this.updateHitbox()
        }
    }

    updateHitbox()
    {
        this.hitBox = {
            x: this.model.position.x,
            z: this.model.position.z,
            width: this.width,
            depth: this.depth
        }

        this.rangeBox = {
            x: this.model.position.x,
            z: this.model.position.z,
            width: this.width*3,
            depth: this.depth*3
        }
    }
}

// the explosion class
class Explosion{
    constructor(position){
        let promise = loadModel('explosion.glb').then((res) => this.model = res.scene);
        Promise.all([promise]).then(() => {
            scene.add(this.model)
            this.model.scale.set(0.3 , 0.3 , 0.3)
            this.model.position.set(position.x , position.y , position.z)
            this.scaleSpeed = 0.01
            this.deleted = false
        })
    }

    // grow in scale until dying
    grow(){
        this.model.scale.set(this.model.scale.x + this.scaleSpeed , this.model.scale.y + this.scaleSpeed , this.model.scale.z + this.scaleSpeed)
        if(this.model.scale.x >= 0.7)
            this.deleted = true
        
    }
}

// cloud class
class Cloud{
    constructor(position){
        let promise = loadModel('cloud.glb').then((res) => this.model = res.scene);
        Promise.all([promise]).then(() => {
            scene.add(this.model)
            this.model.scale.set(0.6 , 0.6 , 0.6)
            this.model.position.set(position.x , position.y , position.z)
            this.speed = 0.07
            // this.deleted = false
        })
    }

    // just move woth background
    move(){
        
        if(this.model.position.z > BACKWARD_LIMIT)
        {
            // this.deleted = true
            this.model.position.z = -30
        }
        else
        {
            this.model.position.z += this.speed 
        }
    }
}

// the earh class
class Earth{
    constructor(position){
        let promise = loadModel('earth.glb').then((res) => this.model = res.scene);
        Promise.all([promise]).then(() => {
            scene.add(this.model)
            this.model.scale.set(4, 3.2 , 3.2  )
            this.model.position.set(position.x , position.y , position.z)
            this.rotSpeed = 0.005
            // this.deleted = false
        })
    }

    rotate()
    {
        this.model.rotation.x += this.rotSpeed
    }
}

// spawn random enemy at any x and y random location
spawnEnemy = () => {
    x_pos = Math.floor(Math.random() * X_LEN) + LEFT_LIMIT;
    random_pos = new THREE.Vector3(x_pos , 0,-100)
    new_enemy = new Enemy(random_pos)
    enemy.push(new_enemy)
    // console.log('aayo')
}

// spawn cloud at random x,y position
spawnInitialCloud = () =>{
    x_chance = Math.random()
    let x_pos
    if(x_chance <= 0.5)
        x_pos = (Math.random() * 6) + (LEFT_LIMIT - 3)
    else
        x_pos = (Math.random() * 6) + 4
    
    y_pos = (Math.random() * 15) - 10
    z_pos = (Math.random() * 30) - 30
    new_cloud = new Cloud(new THREE.Vector3(x_pos , y_pos , z_pos))
    clouds.push(new_cloud)
}


// spawn stars
spawnStar = () => {
    chance = Math.random()
    if(chance <= 0.3)
    {
        x_pos = Math.floor(Math.random() * X_LEN) + LEFT_LIMIT;
        random_pos = new THREE.Vector3(x_pos , 0,-40)
        new_star = new Star(random_pos)
        stars.push(new_star)
    }
    
    // console.log('aayo')
}

// move and updated
updateEnemies = () =>{
    enemy.forEach(e => {
        if(e.model != undefined)
        {   
            if(!e.deleted)
            {
                e.move()
            }            
        }
            
    })

    enemy.filter(e => {
        if(e.deleted)
        {
            scene.remove(e.model)
            e = null
            return false
        }

        return true
    })
}

// spawn nizilie,missile
enemiesShoot = () =>{
    
    enemy.forEach(e => {
        if(e.model != undefined)
        {   
            if(!e.deleted)
            {
                
                e.shootMissile()
            }            
        }
            
    })
}

// move all rockets
updateRockets = () => {
    rockets.forEach(r => {
        if(r.model != undefined)
        {   
            if(!r.deleted)
            {
                r.move()
            }            
        }
            
    })

    rockets.filter(r => {
        if(r.deleted)
        {
            scene.remove(r.model)
            r = null
            return false
        }

        return true
    })
}

// move missiles
updateMissiles = () => {
    nazi_missiles.forEach(m => {
        if(m.model != undefined)
        {   
            if(!m.deleted)
            {
                m.move()
            }            
        }
            
    })

    // console.log(nazi_missiles.length)
    nazi_missiles.filter(m => {
        if(m.deleted)
        {
            scene.remove(m.model)
            m = null
            return false
        }

        return true
    })
}

// move the new stars
updateStars = () => {
    stars.forEach(s => {
        if(s.model != undefined)
        {   
            if(!s.deleted)
            {
                s.move()
            }            
        }
            
    })

    stars.filter(s => {
        if(s.deleted)
        {
            scene.remove(s.model)
            s = null
            return false
        }

        return true
    })
}

// for the clauds

updateClouds = () => {
    clouds.forEach(c => {
        if(c.model != undefined)
        {   
            c.move()          
        }
            
    })
}

// grow till limit
updateExplosions = () =>{
    explosions.forEach(exp => {
        if(exp.model != undefined)
        {
            exp.grow()
        }
    })

    explosions.filter(exp => {
        if(exp.deleted)
        {
            scene.remove(exp.model)
            exp = null
            return false
        }

        return true
    })
}




init = () =>{
    scene = new THREE.Scene()
    scene.background = new THREE.Color(0x66e0ff);
    camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 105);
    camera.position.set(0 , 5 , 10)
    camera.lookAt(0,0,0)
    // setting up scene and camera

    renderer = new THREE.WebGLRenderer({antialias: true})
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);
    player_pos = new THREE.Vector3(0,0,5)
    player = new Player(player_pos)
    earth = new Earth(new THREE.Vector3(0 , -85 , -35))
    // make player , earth and renderer object

    // 2o initial clouds
    for(var i = 0;i<20;i+=1)
    {
        spawnInitialCloud()
    }

    // 3 point lights
    const light1 = new THREE.PointLight(0xffffff, 1.5, 200);
    light1.position.set(0, 0, 10);
    scene.add(light1);

    const light2 = new THREE.PointLight(0xffffff, 1.5, 200);
    light2.position.set(5, 0, 0);
    scene.add(light2);

    const light3 = new THREE.PointLight(0xffffff, 1.5, 200);
    light3.position.set(0 ,10 , 0);
    scene.add(light3);
    

}




function animate(){
    id = requestAnimationFrame(animate);
    TICKS += 1
    updateRockets()
    updateMissiles()
    updateEnemies()
    updateStars()
    updateClouds()
    updateExplosions()
    earth.rotate()
    if(player.model != undefined)
    {   
        // player dying
        document.getElementById("player_health").innerHTML = player.health
        document.getElementById("stars").innerHTML = player.stars
        if(player.dying)
        {
            player.model.position.y -= 0.07
            player.model.position.z -= 0.01
            player.model.rotation.z += 0.1
            player.model.rotation.x = -0.5
            
        }
    }   
    if(TICKS%80 == 0)
    {
        spawnEnemy()
        spawnStar()
    }

    if(TICKS%100 == 0)
    {
        enemiesShoot()
    }
        
    // console.log(TICKS)
    // sphere.rotation.x += 0.01

    renderer.render(scene , camera);
}

onWindowResize = () =>{
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);

}

// capture key down
onDocumentKeyDown = (event) =>{
    var keyCode = event.which
    if (keyCode == 87) {
        player.moveZ(-1)
        player.tiltZ(-1)
        // cube.position.z -= 0.1
    } else if (keyCode == 83) {
        player.moveZ(1)
        player.tiltZ(1)
        // cube.position.z += 0.1
    } else if (keyCode == 65) {
        player.moveX(-1)
        player.tiltX(-1)
        // cube.position.x -= 0.1
    } else if (keyCode == 68) {
        player.moveX(1)
        player.tiltX(1)
        // cube.position.x += 0.1
    }
      else if (keyCode == 88) {
        // console.log('hehe boi')
        player.shootRockets()
    }

    // console.log('x' , cube.position.x)
    // console.log('z' , cube.position.z)
}

// capturee key up
onDocumentKeyUp = (event) =>{
    var keyCode = event.which
    if (keyCode == 87) {
        player.straighten()
    } else if (keyCode == 83) {
        player.straighten()
    } else if (keyCode == 65) {
        player.straighten()
    } else if (keyCode == 68) {
        player.straighten()
    }

    // console.log('x' , cube.position.x)
    // console.log('z' , cube.position.z)
}

window.addEventListener('resize' , onWindowResize , false)
window.addEventListener('keydown' , onDocumentKeyDown , false)
window.addEventListener('keyup' , onDocumentKeyUp , false)

init();

animate()