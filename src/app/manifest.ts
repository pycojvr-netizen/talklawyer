import type { MetadataRoute } from "next";
export default function manifest():MetadataRoute.Manifest{return {name:"Talklawyer",short_name:"Talklawyer",description:"Seu espaço de conexões jurídicas",start_url:"/dashboard",display:"standalone",background_color:"#f5f7fb",theme_color:"#142a47",lang:"pt-BR",icons:[{src:"/icon.svg",sizes:"any",type:"image/svg+xml",purpose:"any"}]};}
