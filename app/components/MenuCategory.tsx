import MenuItem from "./MenuItem";
import { MenuSection } from "../interfaces/category";

interface MenuCategoryProps {
  section: MenuSection;
}

export default function MenuCategory({ section }: MenuCategoryProps) {
  return (
    <section className="w-full">
      {/* Opcional: Mostrar el título de la sección */}
      {/*<div className="mb-6">
        <h2 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
          {section.name}
        </h2>
      </div>*/}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6">
        {section.items && section.items.length > 0 ? (
          section.items.map((item) => (
            <MenuItem key={item.id} item={item} />
          ))
        ) : (
          <div className="col-span-full text-center py-4">
            <p className="text-gray-500">No hay items en esta sección</p>
          </div>
        )}
      </div>
    </section>
  );
}
