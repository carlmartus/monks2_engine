attribute vec3 atLoc;
attribute vec2 atUv;

uniform mat4 unMvp;
varying vec2 vaUv;

void main() {
	vaUv = atUv;
	gl_Position = unMvp*vec4(atLoc, 1);
}

