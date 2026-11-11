export const offices=[
 {id:'tpe',name:'台北',en:'Taipei',country:'台灣',region:'taiwan',head:true,lat:25.04,lon:121.56,address:'7F., No. 10, Sec. 3, Minsheng E. Rd., Taipei City 104511, Taiwan',tel:'+886-2-2531-8677',fax:'+886-2-2531-8577',email:'info.tpe@northgo.com'},
 {id:'txg',name:'台中',en:'Taichung',country:'台灣',region:'taiwan',lat:24.27,lon:120.52,address:'No. 4, Zhongheng 11th Rd., Taichung City 435058, Taiwan',tel:'+886-4-2326-2580',fax:'+886-4-2326-0308',email:'info.txg@northgo.com'},
 {id:'khh',name:'高雄',en:'Kaohsiung',country:'台灣',region:'taiwan',lat:22.62,lon:120.30,address:'19F-2, No.31 Hai-Pien Rd., Kaohsiung City 802609, Taiwan',tel:'+886-7-335-0730',fax:'+886-7-336-4536',email:'info.khh@northgo.com'},
 {id:'lax',name:'洛杉磯',en:'Los Angeles',country:'美國',region:'north-america',lat:34.06,lon:-118.12,address:'119 S. Atlantic Blvd, Ste#301, Monterey Park, CA 91754, USA',tel:'+1-714-853-1088',email:'info.lax@northgo.com'},
 {id:'hcm',name:'胡志明市',en:'Ho Chi Minh City',country:'越南',region:'southeast-asia',lat:10.79,lon:106.72,address:'5th Floor, No. 92D Nguyen Huu Canh Street, Ward 22, Binh Thanh District, Ho Chi Minh City, Vietnam',tel:'+84-28-9995-7368',email:'info.hcmc@northgo.com'},
 {id:'tyo',name:'東京',en:'Tokyo',country:'日本',region:'japan',lat:35.67,lon:139.77,address:'104-0041 6FL., Gran+Ginza-East 1-5-1 Shintomi, Chuo-Ku, Tokyo City, Japan',tel:'+81-3-6260-3944',fax:'+81-3-6260-3945',email:'info.tyo@northgo.com'},
 {id:'osa',name:'大阪',en:'Osaka',country:'日本',region:'japan',lat:34.70,lon:135.50,address:'530-0002 3FL., -B MF Sakura-Bashi Build, 2-6-23 Sonezaki Shinchi, kita-ku, Osaka City, Japan',tel:'+81-6-6676-8395',fax:'+81-6-6676-8397',email:'info.osa@northgo.com'}
];
// Bounds: west, south, east, north. Marker positions are illustrative city locations.
export const regions={world:{name:'全球',bounds:[-178,-56,180,78]},asia:{name:'亞洲',bounds:[94,0,150,47]},taiwan:{name:'台灣',bounds:[119.2,21.2,123.2,26.3]},japan:{name:'日本',bounds:[129,30,144,40]},'north-america':{name:'北美',bounds:[-132,23,-104,49]},'southeast-asia':{name:'東南亞',bounds:[98,3,112,20]}};
export function project(lon,lat){return {x:(lon+180)*1000/360,y:(90-lat)*500/180};}
export function regionOffices(id){return offices.filter(o=>id==='world'||(id==='asia'?o.region!=='north-america':o.region===id));}
export function mapUrl(o){return 'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(o.address);}
