#version 110

uniform sampler2D texture;
uniform vec2 stepSize;
uniform vec4 outlineColor;

vec4 outline(sampler2D texture, vec2 texturePos)
{
	float alpha = 8.0 * texture2D( texture, texturePos ).a;
	alpha -= texture2D( texture, texturePos + vec2( stepSize.x, 0.0 ) ).a;
	alpha -= texture2D( texture, texturePos + vec2( -stepSize.x, 0.0 ) ).a;
	alpha -= texture2D( texture, texturePos + vec2( 0.0, stepSize.y ) ).a;
	alpha -= texture2D( texture, texturePos + vec2( 0.0, -stepSize.y ) ).a;

	alpha -= texture2D( texture, texturePos + vec2( -stepSize.x, -stepSize.y ) ).a;
	alpha -= texture2D( texture, texturePos + vec2( stepSize.x, -stepSize.y ) ).a;
	alpha -= texture2D( texture, texturePos + vec2( -stepSize.x, stepSize.y ) ).a;
	alpha -= texture2D( texture, texturePos + vec2( stepSize.x, stepSize.y ) ).a;

	return vec4( outlineColor.r, outlineColor.g, outlineColor.b, alpha * outlineColor.a );
}

void main()
{
	gl_FragColor = outline(texture, gl_TexCoord[0].xy);
}
