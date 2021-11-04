// classes you may find useful.  Feel free to change them if you don't like the way
// they are set up.

export class Vector {
    constructor(public x: number,
                public y: number,
                public z: number) {
    }
    static times(k: number, v: Vector) { return new Vector(k * v.x, k * v.y, k * v.z); }
    static minus(v1: Vector, v2: Vector) { return new Vector(v1.x - v2.x, v1.y - v2.y, v1.z - v2.z); }
    static plus(v1: Vector, v2: Vector) { return new Vector(v1.x + v2.x, v1.y + v2.y, v1.z + v2.z); }
    static dot(v1: Vector, v2: Vector) { return v1.x * v2.x + v1.y * v2.y + v1.z * v2.z; }
    static mag(v: Vector) { return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z); }
    static norm(v: Vector) {
        var mag = Vector.mag(v);
        var div = (mag === 0) ? Infinity : 1.0 / mag;
        return Vector.times(div, v);
    }
    static cross(v1: Vector, v2: Vector) {
        return new Vector(v1.y * v2.z - v1.z * v2.y,
                          v1.z * v2.x - v1.x * v2.z,
                          v1.x * v2.y - v1.y * v2.x);
    }
}

export class Camera {
    public w : Vector;
    public u : Vector;
    public v : Vector;
    constructor(public pos: Vector,
                public lookat: Vector,
                public up: Vector) {
                    this.w = Vector.times(-1, Vector.norm(Vector.minus(this.pos, lookat)));
                    this.u = Vector.norm(Vector.cross(this.w, up));
                    this.v = Vector.cross(this.w, this.u);
                }
}

export class Light {
    constructor(public color: Color, public x: number, public y: number, public z: number) {
    }
}

export class AmbientLight {
    constructor(public color: Color) {
    }
}

export class Sphere {
    constructor(public origin: Vector, public radius: number, 
        public dr: number, public dg: number, public db: number, 
        public k_ambient: number, public k_specular: number, public specular_pow: number) {
            
    }
}

export class Fov {
    constructor(public theta: number) {
    }
}



export class Color {
    constructor(public r: number,
                public g: number,
                public b: number) {
    }
    static scale(k: number, v: Color) { return new Color(k * v.r, k * v.g, k * v.b); }
    static plus(v1: Color, v2: Color) { return new Color(v1.r + v2.r, v1.g + v2.g, v1.b + v2.b); }
    static times(v1: Color, v2: Color) { return new Color(v1.r * v2.r, v1.g * v2.g, v1.b * v2.b); }
    static white = new Color(1.0, 1.0, 1.0);
    static grey = new Color(0.5, 0.5, 0.5);
    static black = new Color(0.0, 0.0, 0.0);
    static toDrawingColor(c: Color) {
        var legalize = (d: number) => d > 1 ? 1 : d;
        return {
            r: Math.floor(legalize(c.r) * 255),
            g: Math.floor(legalize(c.g) * 255),
            b: Math.floor(legalize(c.b) * 255)
        }
    }
}

interface Ray {
    start: Vector;
    dir: Vector;
}

var lights: Light[];
var ambientLight: AmbientLight;
var spheres: Sphere[];
var camera: Camera;
var backgroundColor: Color;
var fov: number;

// A class for our application state and functionality
class RayTracer {
    // the constructor paramater "canv" is automatically created 
    // as a property because the parameter is marked "public" in the 
    // constructor parameter
    // canv: HTMLCanvasElement
    //
    // rendering context for the canvas, also public
    // ctx: CanvasRenderingContext2D

    // initial color we'll use for the canvas
    canvasColor = "lightyellow"

    canv: HTMLCanvasElement
    ctx: CanvasRenderingContext2D 

    // div is the HTMLElement we'll add our canvas to
    // width, height are the size of the canvas
    // screenWidth, screenHeight are the number of pixels you want to ray trace
    //  (recommend that width and height are multiples of screenWidth and screenHeight)
    constructor (div: HTMLElement,
        public width: number, public height: number, 
        public screenWidth: number, public screenHeight: number) {

        // let's create a canvas and to draw in
        this.canv = document.createElement("canvas");
        this.ctx = this.canv.getContext("2d")!;
        if (!this.ctx) {
            console.warn("our drawing element does not have a 2d drawing context")
            return
        }
 
        div.appendChild(this.canv);

        this.canv.id = "main";
        this.canv.style.width = this.width.toString() + "px";
        this.canv.style.height = this.height.toString() + "px";
        this.canv.width  = this.width;
        this.canv.height = this.height;
    }

    // API Functions you should implement

    // clear out all scene contents
    reset_scene() {
        this.set_eye(0,0,0,0,0,-1,0,1,0);
        this.set_fov(90);
        this.ambient_light(0,0,0);
        this.set_background(1,1,1)
        spheres = [];
        lights= [];
    }

    // create a new point light source
    new_light (r: number, g: number, b: number, x: number, y: number, z: number) {
        lights.push(new Light(new Color(r,g,b),x,y,z));
    }

    // set value of ambient light source
    ambient_light (r: number, g: number, b: number) {
        ambientLight = new AmbientLight(new Color(r,g,b));
    }

    // set the background color for the scene
    set_background (r: number, g: number, b: number) {
        backgroundColor = new Color(r,g,b);
    }

    // set the field of view
    DEG2RAD = (Math.PI/180)
    set_fov (theta: number) {
        fov = theta * this.DEG2RAD;
    }

    // set the virtual camera's position and orientation
    // x1,y1,z1 are the camera position
    // x2,y2,z2 are the lookat position

    // x3,y3,z3 are the up vector
    set_eye(x1: number, y1: number, z1: number, 
            x2: number, y2: number, z2: number, 
            x3: number, y3: number, z3: number) {
                camera = new Camera(new Vector(x1, y1, z1), new Vector(x2, y2, z2), Vector.norm(new Vector(x3, y3, z3)));
    }

    // create a new sphere
    new_sphere (x: number, y: number, z: number, radius: number, 
                dr: number, dg: number, db: number, 
                k_ambient: number, k_specular: number, specular_pow: number) {
                    spheres.push(new Sphere(new Vector(x,y,z),radius,dr,dg,db,k_ambient,k_specular,specular_pow));
    }

    find_t (ray: Ray, sphere: Sphere): number[] {
        var ex = ray.start.x;
        var ey = ray.start.y;
        var ez = ray.start.z;

        var dx = ray.dir.x;
        var dy = ray.dir.y;
        var dz = ray.dir.z;

        var sx = sphere.origin.x
        var sy = sphere.origin.y
        var sz = sphere.origin.z

        var radius = sphere.radius;

        var a = dx * dx + dy * dy + dz * dz;
        var b = 2 * ((dx * (ex - sx)) + (dy * (ey - sy)) + (dz * (ez - sz)));
        var c = (ex - sx) * (ex - sx) + (ey - sy) * (ey - sy) + (ez - sz) * (ez - sz) - radius * radius;

        var discriminant = b * b - 4 * a * c;

        var root : number[] = []

        if (discriminant < 0) {
            return root;
        }
        if (discriminant == 0) {
            root.push((b * -1) / (2 * a));
            return root;
        }
        if (discriminant > 0) {
            root.push(((b * -1) + Math.sqrt(discriminant)) / (2 * a));
            root.push(((b * -1) - Math.sqrt(discriminant)) / (2 * a));
            return root;
        }
        return root;
    }

    // INTERNAL METHODS YOU MUST IMPLEMENT

    // create an eye ray based on the current pixel's position
    private eyeRay(i: number, j: number): Ray {

        var d = 1 / (Math.tan( fov/2 ));
        var us = -1 + ((2 * (i + 0.5)) / this.screenWidth);
        var vs = -1 + ((2 * (j + 0.5)) / this.screenHeight);
        var direct = Vector.norm(Vector.plus(Vector.times(d, camera.w), Vector.plus(Vector.times(us, camera.u), Vector.times(vs, camera.v))))
        var ray : Ray = {start: camera.pos, dir : direct};
        return ray;

    }

    private traceRay(ray: Ray, depth: number = 0): Color {
        var tmin = 99999999;
        var closestObject = spheres[0];
        var pixelColor: Color = backgroundColor;
        var kala: Color;
        for (var i = 0; i < spheres.length; i++) {
            var t: number[] = this.find_t(ray, spheres[i]);
            if (t.length == 0) {
                tmin = tmin;
                closestObject = closestObject;
            } else if (t.length == 1) {
                
                if (t[0] > 0 && t[0] < tmin) {
                    tmin = t[0]
                    closestObject = spheres[i]
                }
            } else if (t.length == 2) {
                
                var temp = 0;
                if (t[0] > 0 && t[1] < 0) {
                    temp = t[0]
                    if (temp < tmin) {
                        tmin = temp
                        closestObject = spheres[i]
                    }
                } else if (t[0] < 0 && t[1] > 0) {
                    temp = t[1]
                    if (temp < tmin) {
                        tmin = temp
                        closestObject = spheres[i]
                    }
                } else if (t[0] > 0 && t[1] > 0) {
                    temp = Math.min(t[0], t[1])
                    if (temp < tmin) {
                        tmin = temp
                        closestObject = spheres[i]
                    }
                }
            }


        }
        if (tmin == 99999999) {
            pixelColor = backgroundColor;
        } else {
            var lightColor = new Color(0,0,0);

            kala = Color.scale(closestObject.k_ambient, ambientLight.color)
            kala = Color.times(kala, new Color(closestObject.dr, closestObject.dg, closestObject.db))

            for (var i = 0; i < lights.length; i++) {
                var P = Vector.plus(ray.start, Vector.times(tmin, ray.dir))
                var N = Vector.norm(Vector.minus(P, closestObject.origin))
                var L = Vector.norm(Vector.minus(new Vector(lights[i].x, lights[i].y, lights[i].z), P))
                var NL = Math.max(0, Vector.dot(N,L))
                
                var V = Vector.norm(Vector.minus(ray.start, P))
                var R = Vector.plus(Vector.times(-1, V), Vector.times(2 * Vector.dot(V,N), N))
                var LR = Math.max(0, Vector.dot(L,R))
                var LR = Math.pow(LR, closestObject.specular_pow)

                var I = lights[i].color
                var kd = new Color(closestObject.dr, closestObject.dg, closestObject.db);

                var tempNumDiff = Color.scale(NL, kd)
                var tempColorDiff = Color.times(tempNumDiff, I)

                var tempNumSpec = Color.scale(closestObject.k_specular, I)
                var tempColorSpec = Color.scale(LR, tempNumSpec)

                lightColor = Color.plus(lightColor, tempColorSpec)
                lightColor = Color.plus(lightColor, tempColorDiff)
            }
            pixelColor = Color.plus(kala, lightColor);

        }
        return pixelColor;
        

    }
        

    // draw_scene is provided to create the image from the ray traced colors. 
    // 1. it renders 1 line at a time, and uses requestAnimationFrame(render) to schedule 
    //    the next line.  This causes the lines to be displayed as they are rendered.
    // 2. it uses the additional constructor parameters to allow it to render a  
    //    smaller # of pixels than the size of the canvas
    draw_scene() {

        // rather than doing a for loop for y, we're going to draw each line in
        // an animationRequestFrame callback, so we see them update 1 by 1
        var pixelWidth = this.width / this.screenWidth;
        var pixelHeight = this.height / this.screenHeight;
        var y = 0;
        
        this.clear_screen();

        var renderRow = () => {
            for (var x = 0; x < this.screenWidth; x++) {

                var ray = this.eyeRay(x, y);
                var c = this.traceRay(ray);

                var color = Color.toDrawingColor(c)
                this.ctx.fillStyle = "rgb(" + String(color.r) + ", " + String(color.g) + ", " + String(color.b) + ")";
                this.ctx.fillRect(x * pixelWidth, y * pixelHeight, pixelWidth+1, pixelHeight+1);
            }
            
            // finished the row, so increment row # and see if we are done
            y++;
            if (y < this.screenHeight) {
                // finished a line, do another
                requestAnimationFrame(renderRow);            
            } else {
                console.log("Finished rendering scene")
            }
        }

        renderRow();
    }

    clear_screen() {
        this.ctx.fillStyle = this.canvasColor;
        this.ctx.fillRect(0, 0, this.canv.width, this.canv.height);

    }
}
export {RayTracer}