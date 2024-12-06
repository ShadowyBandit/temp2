#version 120

varying vec4 vertColour;
varying vec2 texCoords;

uniform vec2 UVScale = vec2(1,1);

void main()
{
	vec4 position = vec4(gl_Vertex.xyz, 1.0);
	texCoords = gl_MultiTexCoord0.st * UVScale.xy;

	gl_Position = gl_ModelViewProjectionMatrix * position;
	vertColour = gl_Color;
}