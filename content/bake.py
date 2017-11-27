import sys, json, re
from glob import glob
from colorama import Fore, Style, init as colorama_init

def main():
    if len(sys.argv) < 3:
        print('[in directory] [out directory]')
        sys.exit(1)

    colorama_init()

    # IN/OUT directories
    dirRead = sys.argv[1]
    dirWrite = sys.argv[2]
    print(
            ('Compiling content from '+
            Fore.YELLOW+'%s'+Style.RESET_ALL+' to '+
            Fore.YELLOW+'%s'+Style.RESET_ALL) % (dirRead, dirWrite))

    # Read sheet meta
    re_frame = re.compile('(\w*)\s*(\d*)\.ase')
    sheet = json.loads(read_file(dirRead, "sheet.json"))
    for name, data in sorted(sheet["frames"].items()):
        if re_frame.match(name):
            print(name)
            fileName, frameNum = re_frame.findall(name)[0]
            if frameNum:
                pass # TODO Animation
                print('Animation')
            else:
                pass # TODO Texture
                print('Texture')
        else:
            sys.exit(1)
    #print(sheet)

    # Read game script
    game_json = json.loads(read_file(dirRead, "script.json"))
    game_json = json.dumps(game_json, indent=4)

    game_json_js = 'GAME = %s' % game_json

    # Write
    write_file(dirWrite, 'game.json', game_json)
    write_file(dirWrite, 'game.js', game_json_js)
    print(Fore.GREEN + 'Baking done!' + Style.RESET_ALL)

def write_file(dir, path, content):
    path = '%s/%s' % (dir, path)
    print(
            ('Writing %d b to '+Fore.CYAN+'%s'+Style.RESET_ALL+'.') %
            (sys.getsizeof(content), path))

    fd = open(path, 'w')
    fd.write(content)
    fd.close()

def read_file(dir, path):
    path = '%s/%s' % (dir, path)

    fd = open(path, 'r')
    content = fd.read()
    fd.close()

    return content

if __name__ == '__main__':
    main()
