#version 120

uniform vec2 UVScale = vec2(1,1);

void main (void)
{
    gl_Position = gl_ModelViewProjectionMatrix * gl_Vertex;
    gl_TexCoord[0].x = gl_MultiTexCoord0.x * UVScale.x;
    gl_TexCoord[0].y = gl_MultiTexCoord0.y * UVScale.y;
	gl_FrontColor = gl_Color;
}