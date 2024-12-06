#version 110

varying float puddlesDirNE;
varying float puddlesDirNW;
varying float puddlesDirAll;
varying float puddlesDirNone;

void main (void)
{
	gl_Position = gl_ModelViewProjectionMatrix * gl_Vertex;
	gl_TexCoord[0] = gl_MultiTexCoord0;
	gl_FrontColor = gl_Color;
    
    puddlesDirNE = gl_MultiTexCoord0.st.x;
    puddlesDirNW = gl_MultiTexCoord0.st.y;
    puddlesDirAll = gl_MultiTexCoord1.st.x;
    puddlesDirNone = 1.0 - gl_MultiTexCoord1.st.y;
}
