"use client";
import { useEffect,useState } from "react";
import { Moon,Sun } from "lucide-react";
export function ThemeToggle(){const [dark,setDark]=useState(false);useEffect(()=>{const value=localStorage.getItem("theme") || (matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light");setDark(value==="dark");document.documentElement.dataset.theme=value;},[]);function toggle(){const v=!dark;setDark(v);document.documentElement.dataset.theme=v?"dark":"light";localStorage.setItem("theme",v?"dark":"light");}return <button className="icon-button" aria-label="Alternar tema" onClick={toggle}>{dark?<Sun size={18}/>:<Moon size={18}/>}</button>;}
