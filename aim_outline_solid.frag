#version 110

varying vec2 texCoords;
uniform sampler2D Texture;
uniform vec4 u_color;

void main()
{
	float alpha = texture2D(Texture, texCoords).a;
	gl_FragColor = vec4(u_color.rgb, u_color.a * alpha);
}

