#version 110

attribute vec4 boneIndices;
attribute vec4 boneWeights;

uniform mat4 MatrixPalette[60];

void main()
{
	vec4 position = vec4(gl_Vertex.xyz, 1.0);

	mat4 boneEffect = mat4(0.0);
	if(boneWeights.x > 0.0)
		boneEffect += MatrixPalette[int(boneIndices.x)] * boneWeights.x;
	if(boneWeights.y > 0.0)
		boneEffect += MatrixPalette[int(boneIndices.y)] * boneWeights.y;
	if(boneWeights.z > 0.0)
		boneEffect += MatrixPalette[int(boneIndices.z)] * boneWeights.z;
	if(boneWeights.w > 0.0)
		boneEffect += MatrixPalette[int(boneIndices.w)] * boneWeights.w;

	gl_Position = gl_ModelViewProjectionMatrix * boneEffect * position;
}
