#version 120

uniform sampler2D DIFFUSE;

void main()
{
    gl_FragColor = texture2D(DIFFUSE, gl_TexCoord[0].st, 0.0);
}