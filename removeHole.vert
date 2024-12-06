#version 120

uniform vec2 UVScale = vec2(1,1);

void main (void)
{
    gl_Position = gl_ModelViewProjectionMatrix * gl_Vertex;
    gl_TexCoord[0].xy = gl_MultiTexCoord0.xy * UVScale.xy;
	gl_FrontColor = gl_Color;
}