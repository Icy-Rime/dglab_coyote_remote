import os

def main():
    name_list = []
    for name in os.listdir("."):
        if name.endswith(".svg"):
            name_list.append(name[0:-4])
    print(name_list)
    with open("feather_icon_name.d.ts", "wt", encoding="utf-8") as f:
        f.write(f"export type IconName =")
        for n in name_list:
            f.write(f"\n    | \"{n}\"")
        f.write(";\n")

if __name__ == "__main__":
    main()
