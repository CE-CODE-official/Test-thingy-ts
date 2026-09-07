import React, { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { ArrowUpRight, Compass, MapPin, Menu, Play, Sparkles, X } from 'lucide-react'
import './style.css'

const milestones = [
  ['01', 'Hatch', 'The shoreline is calling.'],
  ['02', 'Wander', 'Find your gentlest pace.'],
  ['03', 'Return', 'Follow the moon home.'],
]

function TurtleMark() {
  return <svg className="turtle-mark" viewBox="0 0 92 66" aria-hidden="true"><path d="M23 39C13 41 6 47 5 55c10-2 15-6 19-12M69 38c11 2 17 9 18 17-10-2-15-6-19-12M23 23c-9-7-16-7-20-2 6 4 11 7 18 10M69 23c9-7 16-7 20-2-6 4-11 7-18 10" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round"/><path d="M20 32c0-16 12-27 27-27s27 11 27 27-12 25-27 25S20 48 20 32Z" fill="currentColor"/><path d="M32 26c3-7 8-11 15-11s12 4 15 11M29 35c4-4 9-6 18-6s14 2 18 6M31 44c4-4 9-6 16-6s12 2 16 6" fill="none" stroke="#f4f0e8" strokeWidth="3" strokeLinecap="round"/></svg>
}

function App() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [note, setNote] = useState('')
  const [sent, setSent] = useState(false)
  const sendNote = (e) => { e.preventDefault(); if (note.trim()) { setSent(true); setNote('') } }
  return <main>
    <section className="hero">
      <nav><a className="brand" href="#top"><TurtleMark /><span>turtle</span></a><div className="nav-links"><a href="#way">the way</a><a href="#notes">field notes</a><a href="#join">join us</a></div><button className="menu" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle navigation">{menuOpen ? <X /> : <Menu />}</button></nav>
      {menuOpen && <div className="mobile-nav"><a href="#way" onClick={() => setMenuOpen(false)}>the way</a><a href="#notes" onClick={() => setMenuOpen(false)}>field notes</a><a href="#join" onClick={() => setMenuOpen(false)}>join us</a></div>}
      <div className="sun" /><div className="horizon h1" /><div className="horizon h2" />
      <div className="hero-copy" id="top"><p className="eyebrow"><span /> A slower kind of adventure</p><h1>Take the<br/><em>long</em> way home.</h1><p className="intro">We make room for unhurried days, open horizons, and the wonderful places in between.</p><a href="#way" className="round-link">Start wandering <ArrowUpRight /></a></div>
      <div className="hero-turtle"><TurtleMark /></div><p className="coordinates">34° 02' N&nbsp;&nbsp; / &nbsp;&nbsp;118° 15' W</p><div className="scroll">scroll to explore <span>↓</span></div>
    </section>
    <section className="manifesto" id="way"><p className="eyebrow dark"><span /> The turtle way</p><h2>Move at the speed of <em>meaning.</em></h2><div className="manifesto-grid"><p>There is no finish line out here. Just a trail that opens when you do, a warm rock beneath the sun, and enough time to notice it all.</p><a href="#notes" className="text-link">Our philosophy <ArrowUpRight /></a></div></section>
    <section className="expedition"><div className="lake"><div className="sun-small"/><div className="ridge r1"/><div className="ridge r2"/><div className="water-line w1"/><div className="water-line w2"/><div className="water-line w3"/><div className="water-turtle"><TurtleMark /></div><p>somewhere worth staying awhile</p></div><div className="expedition-copy"><p className="eyebrow"><span /> This season</p><h2>A very good place to be <em>slow.</em></h2><p>Join our coastal ramble: seven sun-soaked days following the tide, sharing good food, and remembering how little we need.</p><button onClick={() => document.querySelector('#join').scrollIntoView({behavior: 'smooth'})}>See the journey <ArrowUpRight /></button></div></section>
    <section className="trail" id="notes"><div><p className="eyebrow dark"><span /> How it unfolds</p><h2>One small step,<br/>then another.</h2></div><div className="milestones">{milestones.map(([n, title, copy]) => <article key={n}><b>{n}</b><div className="line"/><h3>{title}</h3><p>{copy}</p></article>)}</div></section>
    <section className="join" id="join"><div className="join-art"><div className="mini-sun"/><TurtleMark /></div><div><p className="eyebrow"><span /> Leave a small note</p><h2>Keep in <em>touch.</em></h2><p>Occasional dispatches from the road. No hurry, no noise.</p><form onSubmit={sendNote}><input value={note} onChange={(e) => setNote(e.target.value)} aria-label="Email address" placeholder="your@email.com" type="email" required/><button aria-label="Submit email"><ArrowUpRight /></button></form>{sent && <small>Thank you — see you somewhere beautiful.</small>}</div></section>
    <footer><a className="brand" href="#top"><TurtleMark /><span>turtle</span></a><p>© 2024 Turtle, taking our time.</p><div><a href="#way">Instagram</a><a href="#notes">Journal</a></div></footer>
  </main>
}
createRoot(document.getElementById('root')).render(<App />)
