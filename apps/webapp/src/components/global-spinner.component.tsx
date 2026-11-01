function GlobalSpinner() {
  return (
    <section id="loader" className="loader">
      <picture className="home-logo">
        <img
          src="/marivo-logo-full-with-background.webp"
          width="247"
          height="250"
          alt="Marivo"
          fetchPriority="high"
        />
      </picture>
    </section>
  );
}

export default GlobalSpinner;
