import Link from "next/link";

function Author() {
  return (
    <span className="fixed text-xs bottom-2 text-white/50">
      Feito por{" "}
      <Link
        href="https://linkedin.com/in/ViniciusDutt"
        target="_blank"
        rel="noopener noreferrer"
        className="font-bold underline"
      >
        Vinícius Dutra
      </Link>
    </span>
  );
}

export { Author };
