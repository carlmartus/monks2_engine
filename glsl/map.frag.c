varying vec2 vaUv;

uniform sampler2D unTex0;

void main() {
	vec4 col = texture2D(unTex0, vaUv);
	if (col.a < 0.5) discard;
	gl_FragColor = col;
}

