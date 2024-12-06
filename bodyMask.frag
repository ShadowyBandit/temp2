#version 120
uniform sampler2D DIFFUSE;
uniform sampler2D MASK;

uniform float maskPaddingRadius = 0.0;

#include "util/bodyMask"

void main()
{
    vec4 col;
    performPaddedBodyMask(DIFFUSE, MASK, maskPaddingRadius, col);

    gl_FragColor = col;
}