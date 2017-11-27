import sys, json
from glob import glob
from colorama import Fore, Style, init as colorama_init

def main():
    if len(sys.argv) < 3:
        print('[in directory] [out directory]')
        sys.exit(1)

    colorama_init()

    dirRead = sys.argv[1]
    dirWrite = sys.argv[2]
    print(
            ('Compiling content from '+
            Fore.YELLOW+'%s'+Style.RESET_ALL+' to '+
            Fore.YELLOW+'%s'+Style.RESET_ALL) % (dirRead, dirWrite))

    game_json = {
            'start': 'intro',
            'script': {
                }
            }
    game_json = json.dumps(game_json)

    game_json_js = 'GAME = %s' % game_json

    write_file(dirWrite, 'game.json', game_json)
    write_file(dirWrite, 'game.js', game_json_js)
    print(Fore.GREEN + 'Baking done!' + Style.RESET_ALL)

def write_file(dir, path, content):
    path = '%s/%s' % (dir, path)
    print(
            ('Writing %d b to '+Fore.CYAN+'%s'+Style.RESET_ALL+'.') %
            (sys.getsizeof(content), path))

    fd = open(path, 'wb')
    fd.write(content)
    fd.close()

if __name__ == '__main__':
    main()
