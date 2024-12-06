#version 110

attribute vec4 a_wallShadeColor;
varying vec4 v_wallShadeColor;

void main(void)
{
	gl_Position = gl_ModelViewProjectionMatrix * gl_Vertex;

	// Object-texture uv coordinates.
	gl_TexCoord[0] = gl_MultiTexCoord0;

	// Wall-lighting color (per-vertex).
	v_wallShadeColor = a_wallShadeColor;

	gl_FrontColor = gl_Color;
}
