import sys, json
from glob import glob
from colorama import Fore, Style

def main():
    if len(sys.argv) < 3:
        print('[in directory] [out directory]')
        sys.exit(1)

    dirRead = sys.argv[1]
    dirWrite = sys.argv[2]
    print('Compiling content from %s to %s' % (dirRead, dirWrite))

    game = {
            'start': 'intro',
            'intro': {
                }
            }

    game_js = 'GAME = %s' % json.dumps(game)

    write_file(dirWrite, 'game.js', game_js)
    print('Done.')

def write_file(dir, path, content):
    path = '%s/%s' % (dir, path)
    print(
            (Fore.CYAN + 'Writing %d b to %s.' + Style.RESET_ALL) %
            (sys.getsizeof(content), path))

    fd = open(path, 'wb')
    fd.write(content)
    fd.close()

if __name__ == '__main__':
    main()
