#version 110

varying vec4 v_wallShadeColor;

void main(void)
{
	gl_Position = gl_ModelViewProjectionMatrix * gl_Vertex;

	// Object-texture uv coordinates
	gl_TexCoord[0] = gl_MultiTexCoord0;

	// Circle-stencil-texture uv coordinates
	gl_TexCoord[1] = gl_MultiTexCoord1;

	// Wall-shading color (per-vertex)
	v_wallShadeColor = gl_Color;
}
