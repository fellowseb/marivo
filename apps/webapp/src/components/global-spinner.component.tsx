function GlobalSpinner() {
  return (
    <section id="loader" className="loader">
      <picture className="home-logo">
        <img
          src="/stagecraft-logo-with-title-transparent.webp"
          width="247"
          height="250"
          alt="StageCraft"
          fetchPriority="high"
        />
      </picture>
    </section>
  );
}

export default GlobalSpinner;
