#version 120

uniform mat4 u_mvp;
varying vec4 v_color;

void main (void)
{
    gl_Position = u_mvp * gl_Vertex;
    gl_TexCoord[0] = gl_MultiTexCoord0;
    v_color = gl_Color;
}
