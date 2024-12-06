#version 110

varying vec3 vertColour;
varying vec3 vertNormal;
varying vec2 texCoords;
varying vec4 positionEye;

uniform mat4 transform;

vec2 SphereMap(in vec3 normal, in vec3 ecPosition3)
{
   float  m;
   vec3   r,u;

   u = normalize(ecPosition3);
   r = reflect(u, normal);
   m = 2.0 * sqrt(r.x * r.x + r.y * r.y + (r.z + 1.0) * (r.z + 1.0));

   return vec2 (r.x / m + 0.5, r.y / m + 0.5);
}

void main()
{
	vec4 position = vec4(gl_Vertex.xyz, 1);
	vec4 normal = vec4(gl_Normal.xyz, 0);

	texCoords = gl_MultiTexCoord0.st;

	vertNormal = (transform * normal).xyz;
	vertColour = vec3(1,1,1);

	gl_Position = gl_ModelViewProjectionMatrix * transform * position;
	
    positionEye = (gl_ModelViewProjectionMatrix * transform * position) - vec4(-0.2, 0.2, 0.2, 0);
}
