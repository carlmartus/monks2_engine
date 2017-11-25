varying vec2 vaUv;

uniform sampler2D unTex0;
uniform float unInvUvMul;

void main() {
	//gl_FragColor = vec4(gl_PointCoord, 0, 1);
	vec4 col = texture2D(unTex0, (vaUv + gl_PointCoord) * unInvUvMul);
	if (col.a > 0.5) {
		gl_FragColor = col;
	} else {
		//gl_FragColor = vec4(1, 0, 1, 1);
		discard;
	}
}

