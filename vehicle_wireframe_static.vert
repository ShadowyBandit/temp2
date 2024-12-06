#version 110

uniform mat4 transform;

void main()
{
	vec4 position = vec4(gl_Vertex.xyz, 1.0);

	gl_Position = gl_ModelViewProjectionMatrix * transform * position;
}
