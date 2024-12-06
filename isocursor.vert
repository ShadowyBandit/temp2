#version 120

void main (void)
{
	gl_Position = gl_ModelViewProjectionMatrix * gl_Vertex;
	
	// Cursor-texture uv coordinates
	gl_TexCoord[0] = gl_MultiTexCoord0;

	// Background-texture uv coordinates
	gl_TexCoord[1] = gl_MultiTexCoord1;
}
