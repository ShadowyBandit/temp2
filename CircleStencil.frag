#version 110

uniform sampler2D texture;
uniform sampler2D CutawayStencil;
varying vec4 v_wallShadeColor;

void main()
{
	// Sample the object texture
	vec4 texColorWall = texture2D(texture, gl_TexCoord[0].st);

	// Sample the circle-stencil texture
	vec4 texCutawayStencil = texture2D(CutawayStencil, gl_TexCoord[1].st);

	// Multiply by the wall-lighting color
	texColorWall.rgb *= v_wallShadeColor.rgb;

	// Set alpha from the stencil alpha
	// TODO: Make the circle-stencil texture with a "smooth" outer fringe.
	texColorWall.rgba *= texCutawayStencil.rrra;
	texColorWall.rgb += 0.75 * texCutawayStencil.b;
	texColorWall.a = max(texColorWall.a, texCutawayStencil.b * texCutawayStencil.a);
	texColorWall.a = max(texColorWall.a, texCutawayStencil.g * texCutawayStencil.a);
	texColorWall.rgb -= texCutawayStencil.g;
    //texColorWall.a *= gl_TexCoord[1].s;

    //texColorWall.rgb = texCutawayStencil.rgb;
	gl_FragColor = texColorWall;
}
