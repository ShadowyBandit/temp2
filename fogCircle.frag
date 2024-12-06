#version 120

uniform sampler2D DIFFUSE;
varying vec4 v_color;

void main()
{
    vec4 col = texture2D(DIFFUSE, gl_TexCoord[0].st, 0.0);
    col *= v_color;
    gl_FragColor = col;
}
