#version 110

varying vec4 vertColour; 
//varying vec2 texCoords;
varying float waterDepth;
varying float waterFlow;
varying float waterSpeed;
varying float isExternal;

void main (void)
{
	gl_Position = gl_ModelViewProjectionMatrix * gl_Vertex;
	gl_TexCoord[0] = gl_MultiTexCoord0;
	vertColour = gl_Color;
    //texCoords = gl_MultiTexCoord0.st;
    isExternal = gl_MultiTexCoord1.st.y;
    waterSpeed = isExternal*gl_MultiTexCoord1.st.x;
    waterDepth = gl_MultiTexCoord0.st.x;
    waterFlow = isExternal*gl_MultiTexCoord0.st.y;
}
