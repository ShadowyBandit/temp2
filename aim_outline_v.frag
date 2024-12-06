#version 120

uniform sampler2D Texture;
uniform vec2 u_resolution;
uniform float u_radius = 0.5;
uniform vec4 u_color;

void main()
{
	vec2 uv = gl_TexCoord[0].xy;

	float blur = u_radius / u_resolution.y;
	
	float sum = texture2D(Texture, uv).a;

	sum += texture2D(Texture, vec2(uv.x, uv.y - 4.0 * blur)).a;
	sum += texture2D(Texture, vec2(uv.x, uv.y - 3.0 * blur)).a;
	sum += texture2D(Texture, vec2(uv.x, uv.y - 2.0 * blur)).a;
	sum += texture2D(Texture, vec2(uv.x, uv.y - 1.0 * blur)).a;
	
	sum += texture2D(Texture, vec2(uv.x, uv.y + 1.0 * blur)).a;
	sum += texture2D(Texture, vec2(uv.x, uv.y + 2.0 * blur)).a;
	sum += texture2D(Texture, vec2(uv.x, uv.y + 3.0 * blur)).a;
	sum += texture2D(Texture, vec2(uv.x, uv.y + 4.0 * blur)).a;

	gl_FragColor = vec4(u_color.rgb, sum);
}

