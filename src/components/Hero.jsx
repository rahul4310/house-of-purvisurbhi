import './Hero.css';

const Hero = () => {
  return (
    <section id="home" className="hero">
      <div className="hero-bg">
        <img src="/images/hero_banner_1782536825998.png" alt="House of PurviSurbhi Collection" />
        <div className="hero-overlay"></div>
      </div>
      <div className="hero-content container animate-fade-in">
        <h1>Elegance Woven in Tradition</h1>
        <p>Discover our exclusive collection of premium sarees and designer ladies suits.</p>
        <div className="hero-buttons">
          <a href="#sarees" className="btn btn-primary">Shop Sarees</a>
          <a href="#suits" className="btn btn-outline" style={{borderColor: 'white', color: 'white'}}>Shop Suits</a>
        </div>
      </div>
    </section>
  );
};

export default Hero;
