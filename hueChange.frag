#version 120
uniform sampler2D DIFFUSE;
uniform float HueChange;
uniform float R = 1.0;
uniform float G = 1.0;
uniform float B = 1.0;

#include "util/math"
#include "util/hueShift"

void main()
{
    vec2 UV =  gl_TexCoord[0].st;
    vec4 col4 = texture2D(DIFFUSE, UV, 0.0);
    vec3 col = col4.xyz;

    col.r *= R;
    col.g *= G;
    col.b *= B;

    col = hueShift(col, HueChange);

    gl_FragColor = vec4(col, col4.a);
}