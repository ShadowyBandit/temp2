#version 120

uniform sampler2D DIFFUSE;
uniform vec2 UVOffset = vec2(0.0);

void main()
{
    // texel.r == 0.0 if BIT_KNOWN is set, otherwise 1.0
    // texel.g == 0.0 if BIT_VISITED is set, otherwise 1.0
    vec4 texel_1 = texture2D(DIFFUSE, gl_TexCoord[0].st - UVOffset, 0.0);
    vec4 texel_2 = texture2D(DIFFUSE, gl_TexCoord[0].st + UVOffset, 0.0);
    gl_FragColor = vec4(gl_Color.rgb, gl_Color.a * max(texel_1.g * texel_1.r, texel_2.g * texel_2.r));
}
