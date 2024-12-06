#version 110
uniform sampler2D DIFFUSE;

uniform float bgl_RenderedTextureWidth; //scene sampler width
uniform float bgl_RenderedTextureHeight; //scene sampler height
uniform float timer;
uniform vec2 TextureSize;
uniform float Zoom;

uniform vec3 Light;
uniform float LightIntensity;
uniform float NightValue; //replaced timeofday.
uniform float Exterior;
uniform float NightVisionGoggles;
uniform float DesaturationVal;
uniform vec4 SearchMode;
uniform vec4 ScreenInfo;
uniform vec4 ParamInfo;
uniform vec4 VarInfo;

float width = bgl_RenderedTextureWidth;
float height = bgl_RenderedTextureHeight;

const vec3 AvgLumin = vec3(0.4, 0.4, 0.4);
const float permTexUnit = 1.0/256.0;		// Perm texture texel-size
const float permTexUnitHalf = 0.5/256.0;	// Half perm texture texel-size

const float grainamount = 0.0003; //grain amount
bool colored = false; //colored noise?
float coloramount = 1.0;
float grainsize = 1.0; //grain particle size (1.5 - 2.5)
float lumamount = 1.0; //

//nightvision:
float contrast2 = 0.5;
const vec3 lumvec = vec3(0.30, 0.59, 0.11);
float lumuminanceAdjust = 1.3;

//blur options:
const float blur_pi = 6.28318530718; 	// Pi times 2
const float blur_directions = 16.0; 		// def. 16.0 - higher number is more slow
const float blur_quality = 3.0; 			// def. 3.0 - higher number is more slow
const float blur_size = 12.0; 			// def. 8.0

int desatArray[3];
int radiusArray[4];
int blurArray[4];
int darknessArray[4];
#include "util/math"

//a random texture generator, but you can also use a pre-computed perturbation texture
vec4 rnm(in vec2 tc)
{
    float noise =  sin(dot(tc + vec2(timer,timer),vec2(12.9898,78.233))) * 43758.5453;

	float noiseR =  fract(noise)*2.0-1.0;
	float noiseG =  fract(noise*1.2154)*2.0-1.0;
	float noiseB =  fract(noise*1.3453)*2.0-1.0;
	float noiseA =  fract(noise*1.3647)*2.0-1.0;

	return vec4(noiseR,noiseG,noiseB,noiseA);
}

float fade(in float t)
 {
	return t*t*t*(t*(t*6.0-15.0)+10.0);
}

float pnoise3D(in vec3 p)
{
	vec3 pi = permTexUnit*floor(p)+permTexUnitHalf; // Integer part, scaled so +1 moves permTexUnit texel
	// and offset 1/2 texel to sample texel centers
	vec3 pf = fract(p);     // Fractional part for interpolation

	// Noise contributions from (x=0, y=0), z=0 and z=1
	float perm00 = rnm(pi.xy).a ;
	vec3  grad000 = rnm(vec2(perm00, pi.z)).rgb * 4.0 - 1.0;
	float n000 = dot(grad000, pf);
	vec3  grad001 = rnm(vec2(perm00, pi.z + permTexUnit)).rgb * 4.0 - 1.0;
	float n001 = dot(grad001, pf - vec3(0.0, 0.0, 1.0));

	// Noise contributions from (x=0, y=1), z=0 and z=1
	float perm01 = rnm(pi.xy + vec2(0.0, permTexUnit)).a ;
	vec3  grad010 = rnm(vec2(perm01, pi.z)).rgb * 4.0 - 1.0;
	float n010 = dot(grad010, pf - vec3(0.0, 1.0, 0.0));
	vec3  grad011 = rnm(vec2(perm01, pi.z + permTexUnit)).rgb * 4.0 - 1.0;
	float n011 = dot(grad011, pf - vec3(0.0, 1.0, 1.0));

	// Noise contributions from (x=1, y=0), z=0 and z=1
	float perm10 = rnm(pi.xy + vec2(permTexUnit, 0.0)).a ;
	vec3  grad100 = rnm(vec2(perm10, pi.z)).rgb * 4.0 - 1.0;
	float n100 = dot(grad100, pf - vec3(1.0, 0.0, 0.0));
	vec3  grad101 = rnm(vec2(perm10, pi.z + permTexUnit)).rgb * 4.0 - 1.0;
	float n101 = dot(grad101, pf - vec3(1.0, 0.0, 1.0));

	// Noise contributions from (x=1, y=1), z=0 and z=1
	float perm11 = rnm(pi.xy + vec2(permTexUnit, permTexUnit)).a ;
	vec3  grad110 = rnm(vec2(perm11, pi.z)).rgb * 4.0 - 1.0;
	float n110 = dot(grad110, pf - vec3(1.0, 1.0, 0.0));
	vec3  grad111 = rnm(vec2(perm11, pi.z + permTexUnit)).rgb * 4.0 - 1.0;
	float n111 = dot(grad111, pf - vec3(1.0, 1.0, 1.0));

	// Blend contributions along x
	vec4 n_x = mix(vec4(n000, n001, n010, n011), vec4(n100, n101, n110, n111), fade(pf.x));

	// Blend contributions along y
	vec2 n_xy = mix(n_x.xy, n_x.zw, fade(pf.y));

	// Blend contributions along z
	float n_xyz = mix(n_xy.x, n_xy.y, fade(pf.z));

	// We're done, return the final noise value.
	return n_xyz;
}

//2d coordinate orientation thing
vec2 coordRot(in vec2 tc, in float angle)
{
	float aspect = width/height;
	float rotX = ((tc.x*2.0-1.0)*aspect*cos(angle)) - ((tc.y*2.0-1.0)*sin(angle));
	float rotY = ((tc.y*2.0-1.0)*cos(angle)) + ((tc.x*2.0-1.0)*aspect*sin(angle));
	rotX = ((rotX/aspect)*0.5+0.5);
	rotY = rotY*0.5+0.5;
	return vec2(rotX,rotY);
}

vec3 contrast(vec3 color, float amount)
{
    color.r = color.r - AvgLumin.r;
    color.g = color.g - AvgLumin.g;
    color.b = color.b - AvgLumin.b;
    color = color * amount;

    color.r = color.r + AvgLumin.r;
    color.g = color.g + AvgLumin.g;
    color.b = color.b + AvgLumin.b;

    return color;
}

// http://www.java-gaming.org/index.php?topic=35123.0
// GL_LINEAR filtering required

vec4 cubic(float v)
{
    vec4 n = vec4(1.0, 2.0, 3.0, 4.0) - v;
    vec4 s = n * n * n;
    float x = s.x;
    float y = s.y - 4.0 * s.x;
    float z = s.z - 4.0 * s.y + 6.0 * s.x;
    float w = 6.0 - x - y - z;
    return vec4(x, y, z, w) * (1.0/6.0);
}

vec4 textureBicubic(sampler2D sampler, vec2 texCoords)
{
//	vec2 texSize = textureSize(sampler, 0);
	vec2 texSize = TextureSize;
	vec2 invTexSize = 1.0 / texSize;

	texCoords = texCoords * texSize - 0.5;

	vec2 fxy = fract(texCoords);
	texCoords -= fxy;

	vec4 xcubic = cubic(fxy.x);
	vec4 ycubic = cubic(fxy.y);

	vec4 c = texCoords.xxyy + vec2(-0.5, +1.5).xyxy;
	
	vec4 s = vec4(xcubic.xz + xcubic.yw, ycubic.xz + ycubic.yw);
	vec4 offset = c + vec4(xcubic.yw, ycubic.yw) / s;
	
	offset *= invTexSize.xxyy;
	
	vec4 sample0 = texture2D(sampler, offset.xz);
	vec4 sample1 = texture2D(sampler, offset.yz);
	vec4 sample2 = texture2D(sampler, offset.xw);
	vec4 sample3 = texture2D(sampler, offset.yw);

	float sx = s.x / (s.x + s.y);
	float sy = s.z / (s.z + s.w);

	return mix(
		mix(sample3, sample2, sx),
		mix(sample1, sample0, sx),
		sy);
}

float blendOverlay(float base, float blend) {
	return base<0.5?(2.0*base*blend):(1.0-2.0*(1.0-base)*(1.0-blend));
}

vec3 blendOverlay(vec3 base, vec3 blend) {
	return vec3(blendOverlay(base.r,blend.r),blendOverlay(base.g,blend.g),blendOverlay(base.b,blend.b));
}

vec3 blendOverlay(vec3 base, vec3 blend, float opacity) {
	return (blendOverlay(base, blend) * opacity + base * (1.0 - opacity));
}

bool floatEquals( in float a, in float b){
	return abs(a - b) < 0.000001;
}

bool floatEquals2( in float a, in float b){
	return abs(a - b) < 0.1;
}

int zeroIsHundred( in int a){
	if ( a == 0 ){
		return 100;
	} else {
		return a;
	}
}

int zeroIsTenThousand( in int a){
	if ( a == 0 ){
		return 10000;
	} else {
		return a;
	}
}

void chopDesat(){
	int block = int(floor(abs(ParamInfo.w) * 100000000.0 + 0.5)) - int(floor(abs(ParamInfo.w) * 100000000.0 + 0.5))/1000000 * 1000000;
	desatArray[0] = block / 100000; 
	block = block - block / 100000 * 100000;
	desatArray[1] = block / 10000; 
	block = block - block / 10000 * 10000;
	desatArray[2] = zeroIsTenThousand(block);
}

void chopRadius(){
	int block = int(floor(abs(SearchMode.y) * 100000000.0 + 0.5)) - int(floor(abs(SearchMode.y) * 100000000.0 + 0.5))/1000000 * 1000000;
	radiusArray[0] = block / 100000; 
	block = block - block / 100000 * 100000;
	radiusArray[1] = zeroIsHundred(block / 1000); 
	block = block - block / 1000 * 1000;
	radiusArray[2] = block / 100; 
	block = block - block / 100 * 100;
	radiusArray[3] = zeroIsHundred(block);
}

void chopBlur(){
	int block = int(floor(abs(SearchMode.x) * 100000000.0 + 0.5)) - int(floor(abs(SearchMode.x) * 100000000.0 + 0.5))/1000000 * 1000000;
	blurArray[0] = 0; 
	blurArray[1] = block / 1000; 
	/*
	blurArray[0] = block / 100000; 
	block = block - block / 100000 * 100000;
	blurArray[1] = zeroIsHundred(block / 1000); 
	*/
	block = block - block / 1000 * 1000;
	blurArray[2] = block / 100; 
	block = block - block / 100 * 100;
	blurArray[3] = zeroIsHundred(block);
}

void chopDarkness(){
	int block = int(floor(abs(VarInfo.y) * 100000000.0 + 0.5)) - int(floor(abs(VarInfo.y) * 100000000.0 + 0.5))/1000000 * 1000000;
	darknessArray[0] = block / 100000; 
	block = block - block / 100000 * 100000;
	darknessArray[1] = zeroIsHundred(block / 1000); 
	block = block - block / 1000 * 1000;
	darknessArray[2] = block / 100; 
	block = block - block / 100 * 100;
	darknessArray[3] = zeroIsHundred(block);
}

//blur outer regions SearchMode
vec3 blur(in vec3 col, in float alpha) {
	vec2 rad = blur_size/ScreenInfo.xy;

	vec2 uv = gl_TexCoord[0].st;
	vec3 c = texture2D(DIFFUSE, uv).rgb;

	for( float d=0.0; d<blur_pi; d+=blur_pi/blur_directions)
	{
		for(float i=1.0/blur_quality; i<=1.0; i+=1.0/blur_quality)
		{
			c += texture2D( DIFFUSE, uv+vec2(cos(d),sin(d))*rad*i).rgb;
		}
	}

	c /= (blur_quality * blur_directions - 15.0);
	c = clamp(c,0.0,1.0);
	return (col*(1.0-alpha))+(c*alpha);
}

float bearingOrigin(in vec2 a){
	a = a - vec2(0.5, 0.5);
	if (a.y >= 0.0){
		return atan(a.y,a.x);
	} else {
		return atan(a.y,a.x) + radians(360.0);
	}
}

float shift(in vec2 coord, in float power) {
	float mainBearing = radians(360.0) * fract(timer * 0.01);
	float delta = min(abs(mod(bearingOrigin(coord) - mainBearing, radians(360.0))), abs(radians(360.0) - mod(bearingOrigin(coord) - mainBearing, radians(360.0))));
	float modDelta = 1.0;
	//return -0.5 * pow(delta/radians(180.0), 2.0) + 1.0;
	//return 0.5 * pow(10.0, -1.0 * delta) + 0.5;
	return modDelta * power/ (-4.0 * radians(180.0)) + 1.0;
}

vec2 textToFrag(in vec2 uv) {
	return vec2(uv.x * TextureSize.x * ParamInfo.x / ScreenInfo.x, uv.y * TextureSize.x * ParamInfo.x / ScreenInfo.y);
}

vec2 fragtoText(in vec2 coord) {
	return vec2(coord.x * ScreenInfo.x / (TextureSize.x * ParamInfo.x), coord.y * ScreenInfo.y / (TextureSize.y * ParamInfo.x));
}

vec3 distortion(in vec2 coord, in float power) {
	//vec2 uv = gl_TexCoord[0].st;
	vec2 origin = vec2(0.5, 0.5);
	vec2 polar = coord - origin;
	return texture2D(DIFFUSE, fragtoText(origin + shift(coord, power) * polar)).rgb;
}

vec3 bloom(in vec3 col) {
	vec2 rad = blur_size/ScreenInfo.xy / 1.5;

	vec2 uv = gl_TexCoord[0].st;
	vec4 bloomLayer = vec4(0.0, 0.0, 0.0, 0.0);

	float luminance = (0.299 * texture2D(DIFFUSE, uv).r) + (0.587 * texture2D(DIFFUSE, uv).g) + (0.114 * texture2D(DIFFUSE, uv).b);
	float saturation = (max(max(texture2D(DIFFUSE, uv).r, texture2D(DIFFUSE, uv).g), texture2D(DIFFUSE, uv).b) - min(min(texture2D(DIFFUSE, uv).r, texture2D(DIFFUSE, uv).g), texture2D(DIFFUSE, uv).b))/max(max(texture2D(DIFFUSE, uv).r, texture2D(DIFFUSE, uv).g), texture2D(DIFFUSE, uv).b);
	float value = max(max(texture2D(DIFFUSE, uv).r, texture2D(DIFFUSE, uv).g), texture2D(DIFFUSE, uv).b);
	bloomLayer = vec4(texture2D(DIFFUSE, uv).rgb, pow(value, 4.0) * luminance);
	
	for( float d=0.0; d<blur_pi; d+=blur_pi/blur_directions)
	{
		for(float i=1.0/blur_quality; i<=1.0; i+=1.0/(2.0 * blur_quality))
		{
			float luminance2 = (0.299 * texture2D(DIFFUSE, uv+vec2(cos(d),sin(d))*rad*i).r) + (0.587 * texture2D(DIFFUSE, uv+vec2(cos(d),sin(d))*rad*i).g) + (0.114 * texture2D(DIFFUSE, uv+vec2(cos(d),sin(d))*rad*i).b);
			float saturation2 = (max(max(texture2D(DIFFUSE, uv+vec2(cos(d),sin(d))*rad*i).r, texture2D(DIFFUSE, uv+vec2(cos(d),sin(d))*rad*i).g), texture2D(DIFFUSE, uv+vec2(cos(d),sin(d))*rad*i).b) - min(min(texture2D(DIFFUSE, uv+vec2(cos(d),sin(d))*rad*i).r, texture2D(DIFFUSE, uv+vec2(cos(d),sin(d))*rad*i).g), texture2D(DIFFUSE, uv+vec2(cos(d),sin(d))*rad*i).b))/max(max(texture2D(DIFFUSE, uv+vec2(cos(d),sin(d))*rad*i).r, texture2D(DIFFUSE, uv+vec2(cos(d),sin(d))*rad*i).g), texture2D(DIFFUSE, uv+vec2(cos(d),sin(d))*rad*i).b);
			float value2 = max(max(texture2D(DIFFUSE, uv+vec2(cos(d),sin(d))*rad*i).r, texture2D(DIFFUSE, uv+vec2(cos(d),sin(d))*rad*i).g), texture2D(DIFFUSE, uv+vec2(cos(d),sin(d))*rad*i).b);
			if (floatEquals2(texture2D(DIFFUSE, uv+vec2(cos(d),sin(d))*rad*i).r, 0.0) && floatEquals2(texture2D(DIFFUSE, uv+vec2(cos(d),sin(d))*rad*i).g, 1.0) && floatEquals2(texture2D(DIFFUSE, uv+vec2(cos(d),sin(d))*rad*i).b, 0.0)){
				bloomLayer += vec4(1.2 * desaturate(texture2D( DIFFUSE, uv).rgb, 0.1), pow(value, 4.0) * (1.0 - i));
			} else {
				bloomLayer += vec4(1.2 * desaturate(texture2D( DIFFUSE, uv+vec2(cos(d),sin(d))*rad*i).rgb, 0.1), pow(value2, 4.0) * (1.0 - i));
			}
		}
	}
	bloomLayer /= (blur_quality * blur_directions - 15.0);
	bloomLayer.a *= 2.0;
	bloomLayer = vec4(clamp(bloomLayer.rgb,0.0,1.0), clamp(bloomLayer.a, 0.0, 1.0));
	return mix(col, bloomLayer.rgb, bloomLayer.a);
	//return bloomLayer.rgb * bloomLayer.a + col * (1.0 - bloomLayer.a);
}

vec3 bloomDistort(in vec3 col, in float power) {
	vec2 rad = blur_size/ScreenInfo.xy / 1.5;

	vec2 uv = gl_TexCoord[0].st;
	vec2 coord = (vec2(gl_FragCoord.x, gl_FragCoord.y) * ParamInfo.x) / ScreenInfo.xy;
	vec2 origin = vec2(0.5, 0.5);
	vec2 polar = coord - vec2(0.5, 0.5);
	vec4 bloomLayer = vec4(0.0, 0.0, 0.0, 0.0);

	float luminance = (0.299 * texture2D(DIFFUSE, fragtoText(origin + shift(coord, power) * polar)).r) + (0.587 * texture2D(DIFFUSE, fragtoText(origin + shift(coord, power) * polar)).g) + (0.114 * texture2D(DIFFUSE, fragtoText(origin + shift(coord, power) * polar)).b);
	float saturation = (max(max(texture2D(DIFFUSE, fragtoText(origin + shift(coord, power) * polar)).r, texture2D(DIFFUSE, fragtoText(origin + shift(coord, power) * polar)).g), texture2D(DIFFUSE, fragtoText(origin + shift(coord, power) * polar)).b) - min(min(texture2D(DIFFUSE, fragtoText(origin + shift(coord, power) * polar)).r, texture2D(DIFFUSE, fragtoText(origin + shift(coord, power) * polar)).g), texture2D(DIFFUSE, fragtoText(origin + shift(coord, power) * polar)).b))/max(max(texture2D(DIFFUSE, fragtoText(origin + shift(coord, power) * polar)).r, texture2D(DIFFUSE, fragtoText(origin + shift(coord, power) * polar)).g), texture2D(DIFFUSE, fragtoText(origin + shift(coord, power) * polar)).b);
	float value = max(max(texture2D(DIFFUSE, fragtoText(origin + shift(coord, power) * polar)).r, texture2D(DIFFUSE, fragtoText(origin + shift(coord, power) * polar)).g), texture2D(DIFFUSE, fragtoText(origin + shift(coord, power) * polar)).b);
	bloomLayer = vec4(texture2D(DIFFUSE, fragtoText(origin + shift(coord, power) * polar)).rgb, pow(value, 4.0) * luminance);
	
	for( float d=0.0; d<blur_pi; d+=blur_pi/blur_directions)
	{
		for(float i=1.0/blur_quality; i<=1.0; i+=1.0/(2.0 * blur_quality))
		{
			float luminance2 = (0.299 * texture2D(DIFFUSE, fragtoText(origin + shift(coord, power) * polar)+vec2(cos(d),sin(d))*rad*i).r) + (0.587 * texture2D(DIFFUSE, fragtoText(origin + shift(coord, power) * polar)+vec2(cos(d),sin(d))*rad*i).g) + (0.114 * texture2D(DIFFUSE, fragtoText(origin + shift(coord, power) * polar)+vec2(cos(d),sin(d))*rad*i).b);
			float saturation2 = (max(max(texture2D(DIFFUSE, fragtoText(origin + shift(coord, power) * polar)+vec2(cos(d),sin(d))*rad*i).r, texture2D(DIFFUSE, fragtoText(origin + shift(coord, power) * polar)+vec2(cos(d),sin(d))*rad*i).g), texture2D(DIFFUSE, fragtoText(origin + shift(coord, power) * polar)+vec2(cos(d),sin(d))*rad*i).b) - min(min(texture2D(DIFFUSE, fragtoText(origin + shift(coord, power) * polar)+vec2(cos(d),sin(d))*rad*i).r, texture2D(DIFFUSE, fragtoText(origin + shift(coord, power) * polar)+vec2(cos(d),sin(d))*rad*i).g), texture2D(DIFFUSE, fragtoText(origin + shift(coord, power) * polar)+vec2(cos(d),sin(d))*rad*i).b))/max(max(texture2D(DIFFUSE, fragtoText(origin + shift(coord, power) * polar)+vec2(cos(d),sin(d))*rad*i).r, texture2D(DIFFUSE, fragtoText(origin + shift(coord, power) * polar)+vec2(cos(d),sin(d))*rad*i).g), texture2D(DIFFUSE, fragtoText(origin + shift(coord, power) * polar)+vec2(cos(d),sin(d))*rad*i).b);
			float value2 = max(max(texture2D(DIFFUSE, fragtoText(origin + shift(coord, power) * polar)+vec2(cos(d),sin(d))*rad*i).r, texture2D(DIFFUSE, fragtoText(origin + shift(coord, power) * polar)+vec2(cos(d),sin(d))*rad*i).g), texture2D(DIFFUSE, fragtoText(origin + shift(coord, power) * polar)+vec2(cos(d),sin(d))*rad*i).b);
			if (floatEquals2(texture2D(DIFFUSE, fragtoText(origin + shift(coord, power) * polar)+vec2(cos(d),sin(d))*rad*i).r, 0.0) && floatEquals2(texture2D(DIFFUSE, fragtoText(origin + shift(coord, power) * polar)+vec2(cos(d),sin(d))*rad*i).g, 1.0) && floatEquals2(texture2D(DIFFUSE, fragtoText(origin + shift(coord, power) * polar)+vec2(cos(d),sin(d))*rad*i).b, 0.0)){
				bloomLayer += vec4(1.2 * desaturate(texture2D( DIFFUSE, uv).rgb, 0.1), pow(value, 4.0) * (1.0 - i));
			} else {
				bloomLayer += vec4(1.2 * desaturate(texture2D( DIFFUSE, uv+vec2(cos(d),sin(d))*rad*i).rgb, 0.1), pow(value2, 4.0) * (1.0 - i));
			}
		}
	}
	bloomLayer /= (blur_quality * blur_directions - 15.0);
	bloomLayer.a *= 2.0;
	bloomLayer = vec4(clamp(bloomLayer.rgb,0.0,1.0), clamp(bloomLayer.a, 0.0, 1.0));
	return mix(col, bloomLayer.rgb, bloomLayer.a);
	//return bloomLayer.rgb * bloomLayer.a + col * (1.0 - bloomLayer.a);
}

//alpha value for SearchMode circle
float searchCircle(in float rad, in vec2 coord, in float zoom) {
	vec2 center = vec2(0.5, 0.5);
	//right click view in distance mod:
	center.x -= (ScreenInfo.z)/ScreenInfo.x;
	center.y += (ScreenInfo.w)/ScreenInfo.y;
	float dist = distance(coord.xy, center);
	dist *= ScreenInfo.x;
	//ParamInfo.y == TileWidth (64 or 32 depending on Core.TileSize), ParamInfo.z == the radius of transition gradient (already in correct pixel amount)
	//float baseAlpha = smoothstep( max(0.0,(rad*ParamInfo.y)-ParamInfo.z), (rad*ParamInfo.y)+ParamInfo.z, dist);
	return smoothstep( max(0.0,(rad*ParamInfo.y)-ParamInfo.z), (rad*ParamInfo.y)+ParamInfo.z, dist); //clamp(alpha*baseAlpha, 0.0, ParamInfo.w); //alpha + ((1.0-alpha)*baseAlpha);assd
}

//SearchMode.xy = alpha, radius, SearchMode.zw = OffscreenLeft and Top, ParamInfo.x = zoom value
//ScreenInfo.xy = screenwidth & height, ScreenInfo.zw = Rightclickoff X & Y
vec3 screenWorld(in vec3 pixel, in vec3 noise) {
	float circleAlpha = 0.0;
	vec3 Diffuse;
	if(VarInfo.x==0.0) {
		Diffuse = desaturate(pixel, DesaturationVal);
	} else {
		vec2 coord = (vec2(gl_FragCoord.x-SearchMode.z, gl_FragCoord.y-SearchMode.w+(56.0/ParamInfo.x)) * ParamInfo.x) / ScreenInfo.xy;
		circleAlpha = searchCircle(SearchMode.y, coord, ParamInfo.x);
		Diffuse = blur(pixel, circleAlpha*SearchMode.x);
		Diffuse = desaturate(Diffuse, max(DesaturationVal,circleAlpha*ParamInfo.w));
		Diffuse *= (1.0-(VarInfo.y*circleAlpha));
	}

	Diffuse = blendOverlay(Diffuse,Light,LightIntensity*Exterior);
	Diffuse = clamp(Diffuse, 0.0, 1.0);
	float luminance = (0.299 * Diffuse.r) + (0.587 * Diffuse.g) + (0.114 * Diffuse.b);

	vec3 col = contrast(desaturate(Diffuse, 0.1), 1.2);
	float invlumuminance = 1.0 - luminance;
	invlumuminance = invlumuminance * invlumuminance;

	//col = col+((noise*(grainamount+((0.010-grainamount)*circleAlpha))) * (invlumuminance * 5.0));
	col = col+((noise*grainamount) * (invlumuminance * 5.0));

	return col;
}

vec3 screenNightvision(in vec3 pixel, in vec3 noise) {
	vec3 Diffuse = pixel;
	float luminance = (0.299 * Diffuse.r) + (0.587 * Diffuse.g) + (0.114 * Diffuse.b);

	Diffuse = mix(Diffuse, vec3(luminance), (NightValue*0.8) * (1.0 - luminance));
	Diffuse = ((1.0 - NightValue) * Diffuse) + (NightValue * Diffuse*Diffuse) * 1.5;

	Diffuse.rg -= NightValue * 0.25 * (1.0 - luminance);
	Diffuse.b +=  (NightValue * 0.25 * (1.0 - luminance));

	vec3 col = contrast(desaturate(Diffuse, 0.1), 1.2);
	float invlumuminance = 1.0 - luminance;
	invlumuminance = invlumuminance * invlumuminance;

	col.rg+=0.45;
	col = col*1.9+((noise*0.015) * (invlumuminance * 5.0));//col = col+((noise*grainamount) * (invlumuminance * 5.0));

	float luminance2 = dot(lumvec,col) ;

	// adjust contrast - 0...1
	luminance2 = clamp(contrast2 * (luminance2 - 0.5) + 0.5, 0.0, 1.0);

	// final green result 0...1
	float green = clamp(luminance2 / 0.59, 0.0, 1.0) * lumuminanceAdjust;

	// vision color - getting green max
	vec3 visionColor = vec3(0.0,green,0.0); //vec3(0,green,0);//vec3(0.1, 0.95, 0.2);

	// final color
	col = col * visionColor;

	return col;
}

vec3 screenThermal(in vec3 pixel, in vec3 noise, in int modifier) {
	vec3 col = pixel + vec3(0.1, 0.1, 0.1);
	float luminance = (0.299 * col.r) + (0.587 * col.g) + (0.114 * col.b);
	float saturation = (max(max(col.r, col.g), col.b) - min(min(col.r, col.g), col.b))/max(max(col.r, col.g), col.b);
	float value = max(max(col.r, col.g), col.b);
	float weight = 0.9;
	float thermal = 2.0 * pow(weight * saturation * value + (1.0 - weight) * luminance, 2.0)* (Exterior/2.0 + 0.5);
	col = thermal * vec3(1.0, 1.0, 1.0) * (Exterior/2.0 + 0.5);
	if (modifier == 2){
		col = 2.0 * col;
	} else if (modifier == 3){
		col = vec3(1.0, 1.0, 1.0) -  2.0 * col;
	} else if (modifier == 4){
		if (thermal < 1.0/6.0){
			col = mix(vec3(0.0, 0.0, 0.0),vec3(0.0, 0.0, 1.0), (thermal - 0.0/6.0) * 6.0);
		} else if (thermal < 2.0/6.0){
			col = mix(vec3(0.0, 0.0, 1.0),vec3(0.0, 1.0, 1.0), (thermal - 1.0/6.0) * 6.0);
		} else if (thermal < 3.0/6.0){
			col = mix(vec3(0.0, 1.0, 1.0),vec3(0.0, 1.0, 0.0), (thermal - 2.0/6.0) * 6.0);
		} else if (thermal < 4.0/6.0){
			col = mix(vec3(0.0, 1.0, 0.0),vec3(1.0, 1.0, 0.0), (thermal - 3.0/6.0) * 6.0);
		} else if (thermal < 5.0/6.0){
			col = mix(vec3(1.0, 1.0, 0.0),vec3(1.0, 0.0, 0.0), (thermal - 4.0/6.0) * 6.0);
		} else {
			col = mix(vec3(1.0, 0.0, 0.0),vec3(1.0, 1.0, 1.0), (thermal - 5.0/6.0) * 6.0);
		}
	}

	return col;
}

float distRatio(in vec2 a, in vec2 b){
	return sqrt((width / height * (a.x - b.x)) * (width / height * (a.x - b.x)) + (a.y - b.y) * (a.y - b.y));
}

float distNoRatio(in vec2 a, in vec2 b){
	return sqrt((a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y));
}

float bearingRatio(in vec2 a, in vec2 b){ //a is coords, b is origin
	if (a.x <= b.x){
		return radians(180.0) + atan((a.y - b.y)/(width / height * (a.x - b.x)));
	} else if (a.y >= b.y){
		return atan((a.y - b.y)/(width / height * (a.x - b.x)));
	} else {
		return radians(360.0) + atan((a.y - b.y)/(width / height * (a.x - b.x)));
	}
}

float beamPattern(in float deg){
    return abs(sin(36.0 * radians(deg)) + sin(8.0 * (radians(deg + timer))))/2.0;
}

vec3 sunbeamColor(in float deg, in float power){
	vec3 baseColor = mix(vec3(1.0, 0.9, 0.8), vec3(1.0, 0.7, 0.0), pow(power, 10.0)/2.0);
	vec3 lighter = baseColor * (pow(2.0 * abs(power-0.5), 20.0)/2.0 + 1.0);
	return mix(baseColor, lighter, abs(sin(32.0 * radians(deg)) + sin(12.0 * (radians(deg + timer))))/4.0);
}

vec3 sunbeamShader(in vec3 pixel, in float power, in vec2 coord) { //Sun
	pixel = blendOverlay(pixel, mix(vec3(1.0, 1.0, 1.0), vec3(1.0, 0.7, 0.0), pow(power, 10.0)/2.0), 0.3);
	float offsetH = 1.0 + 0.1;
	float offsetW = 1.0 + 0.1*height/width;
	if (power < height / (width + height)) {
		float distFromHeight = distRatio(coord, vec2(offsetW, offsetH * power * (width + height) / height));
		float angle = degrees(bearingRatio(coord, vec2(offsetW, offsetH * power * (width + height) / height)));
		float mult = 1.0 + 1.0 / pow(50.0 * distFromHeight, 1.0) * beamPattern(angle);
		return sunbeamColor(angle, power) * max(0.0, mult / pow(10.0 * distFromHeight, 1.0)) + pixel * max(0.0, 1.0 - mult / pow(10.0 * distFromHeight, 1.0));
	} else {
		float distFromWidth = distRatio(coord, vec2(offsetW * (1.0 - (power - height / (width + height)) * (width + height) / width), offsetH));
		float angle = degrees(bearingRatio(coord, vec2(offsetW * (1.0 - (power - height / (width + height)) * (width + height) / width), offsetH)));
		float mult = 1.0 + 1.0 / pow(50.0 * distFromWidth, 1.0) * beamPattern(angle);
		return sunbeamColor(angle, power) * max(0.0, mult / pow(10.0 * distFromWidth, 1.0)) + pixel * max(0.0, 1.0 - mult / pow(10.0 * distFromWidth, 1.0));
	}
}

vec3 eclipseColor(in float deg, in float power, in float dist, in float dist2){
	vec3 baseColor = mix(vec3(1.0, 0.9, 0.7), vec3(1.0, 0.7, 0.0), pow(power, 10.0)/2.0);
	vec3 lighter = baseColor * (pow(2.0 * abs(power-0.5), 20.0)/2.0 + 1.0);
	vec3 umbra = vec3(0.0, 0.0, 0.0);
	return mix(mix(umbra, mix(baseColor, lighter, abs(sin(32.0 * radians(deg)) + sin(12.0 * (radians(deg + timer))))/4.0), clamp(pow(7.0 * dist, 10.0), 0.0, 1.0)), mix(baseColor, lighter, abs(sin(32.0 * radians(deg)) + sin(12.0 * (radians(deg + timer))))/4.0), clamp(pow(7.0 * dist2, 10.0), 0.0, 1.0));
}

vec3 eclipseShader(in vec3 pixel, in float power, in vec2 coord) { //Eclipse
	pixel = blendOverlay(pixel, mix(vec3(1.0, 1.0, 1.0), vec3(1.0, 0.7, 0.0), pow(power, 10.0)/2.0), 0.3);
	float offsetH = 1.0 + 0.1;
	float offsetW = 1.0 + 0.1*height/width;
	float powerOffset = power + 0.15 * (2000.0 * pow(power - 0.5, 3.0));
	if (power < height / (width + height)) {
		float distFromHeight = distRatio(coord, vec2(offsetW, offsetH * power * (width + height) / height));
		float distFromOffset = distRatio(coord, vec2(offsetW, offsetH * powerOffset * (width + height) / height));
		float angle = degrees(bearingRatio(coord, vec2(offsetW, offsetH * power * (width + height) / height)));
		float mult = 1.0 + 1.0 / pow(50.0 * distFromHeight, 1.0) * beamPattern(angle);
		return eclipseColor(angle, power, distFromHeight, distFromOffset) * max(0.0, mult / pow(10.0 * distFromHeight, 1.0)) + pixel * max(0.0, 1.0 - mult / pow(10.0 * distFromHeight, 1.0));
	} else {
		float distFromWidth = distRatio(coord, vec2(offsetW * (1.0 - (power - height / (width + height)) * (width + height) / width), offsetH));
		float distFromOffset = distRatio(coord, vec2(offsetW * (1.0 - (powerOffset - height / (width + height)) * (width + height) / width), offsetH));
		float angle = degrees(bearingRatio(coord, vec2(offsetW * (1.0 - (power - height / (width + height)) * (width + height) / width), offsetH)));
		float mult = 1.0 + 1.0 / pow(50.0 * distFromWidth, 1.0) * beamPattern(angle);
		return eclipseColor(angle, power, distFromWidth, distFromOffset) * max(0.0, mult / pow(10.0 * distFromWidth, 1.0)) + pixel * max(0.0, 1.0 - mult / pow(10.0 * distFromWidth, 1.0));
	}
}

vec3 moonbeamShader(in vec3 pixel, in float power, in vec2 coord, in int modifier) { //Moon
	float offsetH = 1.0 + 0.1;
	float offsetW = 1.0 + 0.1*height/width;
	if (power < height / (width + height)) {
		float distFromHeight = distRatio(coord, vec2(offsetW, offsetH * power * (width + height) / height));
		float angle = degrees(bearingRatio(coord, vec2(offsetW, offsetH * power * (width + height) / height)));
		float mult = 1.0 + 1.0 / pow(50.0 * distFromHeight, 1.0);
		return vec3(float(modifier - 4)/10.0, float(modifier - 4)/10.0, float(modifier - 4)/10.0) * max(0.0, mult / pow(10.0 * distFromHeight, 1.0)) + pixel * max(0.0, 1.0 - mult / pow(10.0 * distFromHeight, 1.0));
	} else {
		float distFromWidth = distRatio(coord, vec2(offsetW * (1.0 - (power - height / (width + height)) * (width + height) / width), offsetH));
		float angle = degrees(bearingRatio(coord, vec2(offsetW * (1.0 - (power - height / (width + height)) * (width + height) / width), offsetH)));
		float mult = 1.0 + 1.0 / pow(50.0 * distFromWidth, 1.0);
		return vec3(float(modifier - 4)/10.0, float(modifier - 4)/10.0, float(modifier - 4)/10.0) * max(0.0, mult / pow(10.0 * distFromWidth, 1.0)) + pixel * max(0.0, 1.0 - mult / pow(10.0 * distFromWidth, 1.0));
	}
}

vec3 bloodMoonbeamShader(in vec3 pixel, in float power, in vec2 coord) { //Blood Moon
	float offsetH = 1.0 + 0.1;
	float offsetW = 1.0 + 0.1*height/width;
	if (power < height / (width + height)) {
		float distFromHeight = distRatio(coord, vec2(offsetW, offsetH * power * (width + height) / height));
		float angle = degrees(bearingRatio(coord, vec2(offsetW, offsetH * power * (width + height) / height)));
		float mult = 1.0 + 1.0 / pow(50.0 * distFromHeight, 1.0);
		return vec3(0.5, 0.3, 0.2) * max(0.0, mult / pow(10.0 * distFromHeight, 1.0)) + pixel * max(0.0, 1.0 - mult / pow(10.0 * distFromHeight, 1.0));
	} else {
		float distFromWidth = distRatio(coord, vec2(offsetW * (1.0 - (power - height / (width + height)) * (width + height) / width), offsetH));
		float angle = degrees(bearingRatio(coord, vec2(offsetW * (1.0 - (power - height / (width + height)) * (width + height) / width), offsetH)));
		float mult = 1.0 + 1.0 / pow(50.0 * distFromWidth, 1.0);
		return vec3(0.5, 0.3, 0.2) * max(0.0, mult / pow(10.0 * distFromWidth, 1.0)) + pixel * max(0.0, 1.0 - mult / pow(10.0 * distFromWidth, 1.0));
	}
}

vec3 vignette(in vec3 pixel, in float power, in vec2 coord) {
	return mix(pixel, vec3(0.0, 0.0, 0.0), clamp((1.0 + sqrt(2.0)) * (2.0 * (distNoRatio(coord, vec2(0.5, 0.5)) + 0.1 * power) - 1.0), 0.0, 1.0));
}

vec3 tint(in vec3 pixel, in float power, in int modifier) {
	if (modifier == 1) { //Red
		return mix(desaturate(pixel, power), vec3(0.9,0.1,0.0), power/2.0);
	} else if (modifier == 2) { //Orange
		return mix(desaturate(pixel, power), vec3(1.0,0.6,0.0), power/4.0);
	} else if (modifier == 3) { //Blue
		return mix(desaturate(pixel, power), vec3(0.6,0.8,1.0), power/4.0);
	}/* else if (modifier == 4) { //Green
		return blendOverlay(desaturate(pixel, power), vec3(0.5,0.7,0.0), power/2.0);
	}*/
}

vec3 brightnessShader(in vec3 pixel, in float power) { //White
	return blendOverlay(desaturate(pixel, power * 0.25), vec3(1.0,1.0,1.0), power/2.0);
}

vec3 darknessShader(in vec3 pixel, in float power) { //Black
	return blendOverlay(desaturate(pixel, power * 0.25), vec3(0.0,0.0,0.0), power/2.0);
}

void main()
{
	vec2 UV =  gl_TexCoord[0].st;
	vec2 coord = (vec2(gl_FragCoord.x, gl_FragCoord.y) * ParamInfo.x) / ScreenInfo.xy;

	vec3 rotOffset = vec3(1.425,3.892,5.835); //rotation offset values
	vec2 rotCoordsR = coordRot(UV, timer + rotOffset.x);
	vec3 noise = vec3(pnoise3D(vec3(rotCoordsR*vec2(width/grainsize,height/grainsize),0.0)));

	vec3 pixel = textureBicubic(DIFFUSE, gl_TexCoord[0].st).xyz;

	vec3 col = pixel;
	// SearchMode.x is blur, ParamInfo.w is desat, SearchMode.y is radius, VarInfo.y is darkness
	chopDesat();
	chopRadius();
	chopBlur();
	chopDarkness();
	/*if (coord.x <= float(blurArray[1])/250.0){
		if (ParamInfo.w < 0.0 || ParamInfo.w > 0.5) {
			if (darknessArray[2] != 0) {
				if (blurArray[2] == 1){
					float logisticalPower = 1.0/(1.0 + exp(-10.0 * (float(blurArray[3])/100.0 - 0.5)));
					col = distortion(coord, logisticalPower);
					col = bloomDistort(screenWorld(col, noise), logisticalPower);
				} else {
					col = bloom(screenWorld(col, noise));
				}
				if (darknessArray[2] == 1) {
					col = screenNightvision(col, noise);
				} else if (darknessArray[2] == 2) {
					col = screenThermal(col, noise, 2);
				} else if (darknessArray[2] == 3) {
					col = screenThermal(col, noise, 3);
				} else if (darknessArray[2] == 4) {
					col = screenThermal(col, noise, 4);
				}
			} else {
				if (blurArray[2] == 1){
					float logisticalPower = 1.0/(1.0 + exp(-10.0 * (float(blurArray[3])/100.0 - 0.5)));
					col = distortion(coord, logisticalPower);
					col = bloomDistort(screenWorld(col, noise), logisticalPower);
				} else {
					col = bloom(screenWorld(col, noise));
				}
				
				if (radiusArray[0] == 1){
					col = brightnessShader(col, float(radiusArray[1])/100.0);
				} else if (radiusArray[0] == 2){
					col = darknessShader(col, float(radiusArray[1])/100.0);
				}
				
				col = vignette(col, 0.0, coord);
				
				if (desatArray[1] == 2){
					col = sunbeamShader(col, float(desatArray[2])/10000.0, coord);
				} else if (desatArray[1] == 3){
					col = eclipseShader(col, float(desatArray[2])/10000.0, coord);
				} else if (4 <= desatArray[1] && desatArray[1] <= 8){
					col = moonbeamShader(col, float(desatArray[2])/10000.0, coord, desatArray[1]);
				} else if (desatArray[1] == 9){
					col = bloodMoonbeamShader(col, float(desatArray[2])/10000.0, coord);
				}
				
				if (radiusArray[2] != 0) {
					col = tint(col, float(radiusArray[3])/100.0, radiusArray[2]);
				}
				
				if (darknessArray[0] != 0) {
					col = tint(col, float(darknessArray[1])/100.0, darknessArray[0]);
				}
				
				col = desaturate(col, float(darknessArray[3])/100.0);
			}
		} else {
			col = bloom(screenWorld(col, noise));
		}
	} else {
		col = screenWorld(col, noise);
	}
	*/
	if (ParamInfo.w < 0.0 || ParamInfo.w > 0.5) {
		if (darknessArray[2] != 0) {
			if (blurArray[2] == 1){
				float logisticalPower = 1.0/(1.0 + exp(-10.0 * (float(blurArray[3])/100.0 - 0.5)));
				col = distortion(coord, logisticalPower);
				//col = bloomDistort(screenWorld(col, noise), logisticalPower);
			} else {
				col = bloom(screenWorld(col, noise));
			}
			if (darknessArray[2] == 1) {
				col = screenNightvision(col, noise);
			} else if (darknessArray[2] == 2) {
				col = screenThermal(col, noise, 2);
			} else if (darknessArray[2] == 3) {
				col = screenThermal(col, noise, 3);
			} else if (darknessArray[2] == 4) {
				col = screenThermal(col, noise, 4);
			}
		} else {
			if (blurArray[2] == 1){
				float logisticalPower = 1.0/(1.0 + exp(-10.0 * (float(blurArray[3])/100.0 - 0.5)));
				col = distortion(coord, logisticalPower);
				//col = bloomDistort(screenWorld(col, noise), logisticalPower);
			} else {
				col = bloom(screenWorld(col, noise));
			}
			
			if (radiusArray[0] == 1){
				col = brightnessShader(col, float(radiusArray[1])/100.0);
			} else if (radiusArray[0] == 2){
				col = darknessShader(col, float(radiusArray[1])/100.0);
			}
			
			col = vignette(col, 0.0, coord);
			
			if (desatArray[1] == 2){
				col = sunbeamShader(col, float(desatArray[2])/10000.0, coord);
			} else if (desatArray[1] == 3){
				col = eclipseShader(col, float(desatArray[2])/10000.0, coord);
			} else if (4 <= desatArray[1] && desatArray[1] <= 8){
				col = moonbeamShader(col, float(desatArray[2])/10000.0, coord, desatArray[1]);
			} else if (desatArray[1] == 9){
				col = bloodMoonbeamShader(col, float(desatArray[2])/10000.0, coord);
			}
			
			if (radiusArray[2] != 0) {
				col = tint(col, float(radiusArray[3])/100.0, radiusArray[2]);
			}
			
			if (darknessArray[0] != 0) {
				col = tint(col, float(darknessArray[1])/100.0, darknessArray[0]);
			}
			
			col = desaturate(col, float(darknessArray[3])/100.0);
		}
	} else {
		col = screenWorld(col, noise);
	}
	gl_FragColor = vec4(col, 1.0);
}