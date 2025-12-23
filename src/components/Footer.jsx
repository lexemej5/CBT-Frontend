import React from 'react'

const Footer = () => {
  return (
    <footer className="home-footer">
        <div className="developer">
          <img src="././public\assets\images\user-profile.png"/>
          <p>Developed By: Whizzer</p>
        </div>
        <p>&copy; {new Date().getFullYear()} CBT System. All rights reserved.</p>
      </footer>
  )
}

export default Footer;