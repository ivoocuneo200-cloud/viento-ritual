import React from "react";
import { NavLink } from "react-router-dom";

export default function TabsNav() {
  const tabBase = {
    padding: "10px 18px",
    borderRadius: 999,
    fontWeight: "bold",
    fontSize: 14,
    textDecoration: "none",
    display: "inline-block",
    backdropFilter: "blur(8px)",
    transition: "all 0.3s ease",
  };

  return (
<div
  style={{
    display: "flex",
    gap: 14,
    justifyContent: "center",
    width: "100%",
    maxWidth: 500,
    margin: "0 auto",

  }}
>





    
      <div style={{ display: "flex", gap: 14, justifyContent: "center" }}>
        
        <NavLink
          to="/inicio"
          style={({ isActive }) => ({
            ...tabBase,
            background: isActive
              ? "linear-gradient(135deg, #f59e0b, #ec4899, #7c3aed)"
              : "rgba(255,255,255,0.05)",
            color: "white",
            border: isActive
              ? "1px solid rgba(236,72,153,0.6)"
              : "1px solid rgba(255,255,255,0.1)",
            boxShadow: isActive
              ? "0 0 15px rgba(236,72,153,0.6)"
              : "none",
          })}
        >
          Inicio
        </NavLink>

        <NavLink
          to="/"
          style={({ isActive }) => ({
            ...tabBase,
            background: isActive
              ? "linear-gradient(135deg, #f59e0b, #ec4899, #7c3aed)"
              : "rgba(255,255,255,0.05)",
            color: "white",
            border: isActive
              ? "1px solid rgba(236,72,153,0.6)"
              : "1px solid rgba(255,255,255,0.1)",
            boxShadow: isActive
              ? "0 0 15px rgba(236,72,153,0.6)"
              : "none",
          })}
        >
          Eventos
        </NavLink>

        <NavLink
          to="/playlist"
          style={({ isActive }) => ({
            ...tabBase,
            background: isActive
              ? "linear-gradient(135deg, #f59e0b, #ec4899, #7c3aed)"
              : "rgba(255,255,255,0.05)",
            color: "white",
            border: isActive
              ? "1px solid rgba(236,72,153,0.6)"
              : "1px solid rgba(255,255,255,0.1)",
            boxShadow: isActive
              ? "0 0 15px rgba(236,72,153,0.6)"
              : "none",
          })}
        >
          Playlist
        </NavLink>

        <NavLink
          to="/merch"
          style={({ isActive }) => ({
            ...tabBase,
            background: isActive
              ? "linear-gradient(135deg, #f59e0b, #ec4899, #7c3aed)"
              : "rgba(255,255,255,0.05)",
            color: "white",
            border: isActive
              ? "1px solid rgba(236,72,153,0.6)"
              : "1px solid rgba(255,255,255,0.1)",
            boxShadow: isActive
              ? "0 0 15px rgba(236,72,153,0.6)"
              : "none",
          })}
        >
          Venta de Merch
        </NavLink>

      </div>
    </div>
  );
}
