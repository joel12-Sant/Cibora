import Link from "next/link";

export default async function StyleButton(ruta: string, description: string, text: string,textsize?: string, metod?: string | null) {
    const classN : string = `block text-center rounded-full px-4 py-2 font-medium ${textsize} 
                !bg-amber-500 !text-white no-underline
                hover:!text-orange-700 hover:!bg-orange-50 transition
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500`;
    return (
    <>{
        metod ? (
            <form action={ruta} method={metod}>
                <button
                    type="submit"
                    className="
                block text-center rounded-full px-4 py-2 font-medium
                !bg-amber-500 !text-white no-underline
                hover:!text-orange-700 hover:!bg-orange-50 transition
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500
                  "
                >
                    {text}
                </button>
            </form>
        ) : (
            <Link
                href={ruta}
                aria-label={description}
                className={classN}
            >
                {text}
            </Link>)
    }
 </>);
}
