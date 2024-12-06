#version 110

varying vec2 texCoords;

uniform mat4 transform;

void main()
{
	vec4 position = vec4(gl_Vertex.xyz, 1);
	vec4 normal = vec4(gl_Normal.xyz, 0);

	texCoords = gl_MultiTexCoord0.st;

	vec4 o = gl_ModelViewProjectionMatrix * transform * position;
//	o.z -= DepthBias;
	gl_Position = o;
}

