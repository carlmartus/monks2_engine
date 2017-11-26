attribute vec3 atLoc;
attribute float atSize;
attribute vec2 atUv;

varying vec2 vaUv;

uniform mat4 unMvp;
uniform float unKMul;

void main() {
	vaUv = atUv;
	gl_Position = unMvp*vec4(atLoc, 1);
	gl_PointSize = atSize * unKMul / gl_Position.w;

	if (gl_Position.w < 0.6) {
		gl_Position.z = -2.0;
		gl_Position.w = -2.0;
	}
}

